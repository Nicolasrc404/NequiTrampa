#!/usr/bin/env python3
"""
Genera la coleccion y el environment de Postman a partir de las pruebas Bruno (tests/bruno), que son la unica fuente de verdad.

Uso (desde la raiz del repo):
    python tests/postman/generate_from_bruno.py

Salida:
    tests/postman/NequiTrampa.gcp.postman_collection.json
    tests/postman/NequiTrampa.gcp.postman_environment.json

Los scripts de Bruno (pre/post-request y bloques `tests`) se ejecutan en Postman sin cambios gracias a un pequeno "shim"
(objetos `res`, `bru`, `req`, `require("uuid")`). Los `assert { ... }` se traducen a `pm.test`.
"""
import json
import pathlib
import re

HERE = pathlib.Path(__file__).resolve().parent
BRU = HERE.parent / "bruno"
FOLDER_ORDER = ["authorization", "health", "wallet", "recharges", "transfers", "workers", "finance", "profile",
                "assistant", "backoffice", "gateway", "realtime"]

SHIM = """\
const _res = (() => { let b; try { b = pm.response.json(); } catch (e) { b = undefined; } return b; })();
const res = {
  status: pm.response.code, body: _res,
  getStatus: () => pm.response.code, getBody: () => _res,
  getHeader: (n) => pm.response.headers.get(n) || undefined,
  getHeaders: () => Object.fromEntries(pm.response.headers.map(h => [h.key, h.value])),
};
const bru = {
  setVar: (k, v) => pm.collectionVariables.set(k, v), getVar: (k) => pm.collectionVariables.get(k),
  getEnvVar: (k) => pm.environment.get(k),
  sleep: (ms) => { const end = Date.now() + ms; while (Date.now() < end) {} },
};
const test = pm.test, expect = pm.expect;
const _get = require('lodash').get;
"""

PRE_SHIM = """\
const bru = {
  setVar: (k, v) => pm.collectionVariables.set(k, v), getVar: (k) => pm.collectionVariables.get(k),
  getEnvVar: (k) => pm.environment.get(k),
  sleep: (ms) => { const end = Date.now() + ms; while (Date.now() < end) {} },
};
const require = (m) => { if (m === 'uuid') return { v4: () => pm.variables.replaceIn('{{$guid}}') }; throw new Error('require(' + m + ') no soportado en Postman'); };
"""

# Autenticacion por persona (equivalente a tests/bruno/collection.bru, con pm.sendRequest).
COLLECTION_PRE = r"""
const persona = pm.request.headers.get('X-Persona');
pm.request.headers.remove('X-Persona');
if (persona) {
  const mode = pm.environment.get('authMode') || 'jwt';
  const env = (k) => pm.environment.get(k);
  if (mode === 'demo') {
    const table = {
      client:   [env('clientUser'), 'CLIENTE', env('clientGuid')],
      outsider: [env('clientUser2'), 'CLIENTE', null],
      support:  [env('supportUser'), env('supportRole') || 'SOPORTE', null],
      operator: [env('operatorUser') || 'operator-1', 'OPERADOR_FINANCIERO', null],
      admin:    [env('adminUser'), env('adminRole') || 'ADMIN', null],
    };
    const [user, role, clientId] = table[persona];
    pm.request.headers.upsert({ key: 'X-Demo-User', value: user });
    pm.request.headers.upsert({ key: 'X-Demo-Role', value: role });
    if (clientId) pm.request.headers.upsert({ key: 'X-Demo-Client-Id', value: clientId });
  } else {
    const key = 'jwt_' + persona, expKey = 'jwtExp_' + persona;
    const cached = pm.collectionVariables.get(key);
    const exp = Number(pm.collectionVariables.get(expKey) || 0);
    if (cached && Date.now() < exp) {
      pm.request.headers.upsert({ key: 'Authorization', value: 'Bearer ' + cached });
    } else {
      const email = env('email_' + persona), password = env('testPassword'), apiKey = env('firebaseApiKey');
      if (!email || !password || !apiKey) throw new Error('Define email_' + persona + ', testPassword y firebaseApiKey en el environment');
      pm.sendRequest({
        url: 'https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=' + apiKey,
        method: 'POST', header: { 'Content-Type': 'application/json' },
        body: { mode: 'raw', raw: JSON.stringify({ email, password, returnSecureToken: true }) },
      }, (err, r) => {
        if (err || r.code !== 200) throw new Error('Login fallido para ' + persona + ': ' + (err || r.text()));
        const j = r.json();
        pm.collectionVariables.set(key, j.idToken);
        pm.collectionVariables.set(expKey, String(Date.now() + (Number(j.expiresIn) - 120) * 1000));
        pm.request.headers.upsert({ key: 'Authorization', value: 'Bearer ' + j.idToken });
      });
    }
  }
}
"""


def blocks(text):
    """Top-level `name { ... }` blocks of a .bru file (closing brace at column 0)."""
    out = {}
    for m in re.finditer(r"^([A-Za-z0-9:_-]+) \{\n(.*?)^\}\n?", text, re.S | re.M):
        out[m.group(1)] = m.group(2)
    return out


def dedent(s):
    return "\n".join(l[2:] if l.startswith("  ") else l for l in s.rstrip().splitlines())


def literal(v):
    v = v.strip()
    if v in ("true", "false") or re.fullmatch(r"-?\d+(\.\d+)?", v):
        return v
    return json.dumps(v)


def translate_asserts(block):
    tests = []
    for line in block.splitlines():
        line = line.strip()
        if not line:
            continue
        path, _, rest = line.partition(": ")
        op, _, val = rest.partition(" ")
        get = f"_get(res, {json.dumps(path[4:])})"
        interp = f"pm.variables.replaceIn({json.dumps(val.strip())})"
        if op == "eq":
            expected = literal(val) if "{{" not in val else interp
            body = f"pm.expect({get}).to.eql({expected})"
        elif op == "gt":
            body = f"pm.expect({get}).to.be.above({val.strip()})"
        elif op == "isDefined":
            body = f"pm.expect({get}).to.not.equal(undefined)"
        elif op == "isUndefined":
            body = f"pm.expect({get}).to.equal(undefined)"
        elif op == "isString":
            body = f"pm.expect(typeof {get}).to.equal('string')"
        elif op == "isNumber":
            body = f"pm.expect(typeof {get}).to.equal('number')"
        else:
            raise ValueError(f"assert no soportado: {line}")
        tests.append(f"pm.test({json.dumps(line)}, () => {{ {body}; }});")
    return tests


def convert(path):
    text = path.read_text(encoding="utf8", errors="replace")
    b = blocks(text)
    meta = dict(l.strip().split(": ", 1) for l in b["meta"].splitlines() if ": " in l)
    method = next(m for m in ("get", "post", "put", "patch", "delete", "options", "head") if m in b)
    http = dict(l.strip().split(": ", 1) for l in b[method].splitlines() if ": " in l)
    url = http["url"]
    headers = []
    for l in b.get("headers", "").splitlines():
        if ": " in l:
            k, v = l.strip().split(": ", 1)
            headers.append({"key": k, "value": v})
    req = {"method": method.upper(), "header": headers, "url": url}
    if "body:json" in b:
        req["header"].append({"key": "Content-Type", "value": "application/json"})
        req["body"] = {"mode": "raw", "raw": dedent(b["body:json"])}
    events = []
    pre = b.get("script:pre-request")
    if pre:
        pre = pre.replace("await bru.sleep", "bru.sleep")
        events.append({"listen": "prerequest", "script": {"type": "text/javascript", "exec": (PRE_SHIM + dedent(pre)).splitlines()}})
    tests = []
    if "script:post-response" in b:
        tests.append(dedent(b["script:post-response"]))
    if "assert" in b:
        tests.extend(translate_asserts(b["assert"]))
    if "tests" in b:
        tests.append(dedent(b["tests"]))
    if tests:
        events.append({"listen": "test", "script": {"type": "text/javascript", "exec": (SHIM + "\n".join(tests)).splitlines()}})
    item = {"name": meta["name"], "request": req}
    if events:
        item["event"] = events
    return int(meta.get("seq", 0)), item


def main():
    folders = []
    dirs = [d for d in FOLDER_ORDER if (BRU / d).is_dir()]
    dirs += sorted(d.name for d in BRU.iterdir() if d.is_dir() and d.name not in FOLDER_ORDER and d.name != "environments")
    for d in dirs:
        items = sorted((convert(f) for f in (BRU / d).glob("*.bru")), key=lambda t: t[0])
        folders.append({"name": d, "item": [i for _, i in items]})

    collection = {
        "info": {
            "name": "NequiTrampa - GCP (produccion via Gateway)",
            "description": (
                "Generada con tests/postman/generate_from_bruno.py desde tests/bruno (no editar a mano).\n"
                "Todo el trafico pasa por el API Gateway publico, igual que el front: JWT de Identity Platform (sin cabeceras demo).\n"
                "Environment: define `testPassword` y `firebaseApiKey` (secretos) y ejecuta infra/seed-identity.sh una vez.\n"
                "Los tests crean datos reales en produccion (recargas, transferencias, reversos, casos)."),
            "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
        },
        "event": [{"listen": "prerequest", "script": {"type": "text/javascript", "exec": COLLECTION_PRE.strip().splitlines()}}],
        "item": folders,
    }
    (HERE / "NequiTrampa.gcp.postman_collection.json").write_text(json.dumps(collection, indent=2, ensure_ascii=False), encoding="utf8")

    env_text = (BRU / "environments" / "gcp.bru").read_text(encoding="utf8")
    vars_block = blocks(env_text)["vars"]
    sec = re.search(r"^vars:secret \[\n(.*?)^\]", env_text, re.S | re.M)
    secrets = [x.strip().rstrip(",") for x in sec.group(1).splitlines() if x.strip()] if sec else []
    values = []
    for l in vars_block.splitlines():
        if ": " in l:
            k, v = l.strip().split(": ", 1)
            values.append({"key": k, "value": v, "type": "default", "enabled": True})
    for s in secrets:
        values.append({"key": s, "value": "", "type": "secret", "enabled": True})
    (HERE / "NequiTrampa.gcp.postman_environment.json").write_text(
        json.dumps({"name": "NequiTrampa GCP", "values": values}, indent=2), encoding="utf8")
    print(f"{sum(len(f['item']) for f in folders)} requests en {len(folders)} carpetas")


if __name__ == "__main__":
    main()
