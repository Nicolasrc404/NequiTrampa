// ============================================================
// Pruebas de recorrido completo contra un backend simulado
// ============================================================
// No sustituyen la validación E2E contra GCP: comprueban, en un solo proceso,
// que los servicios reales del frontend respetan autenticación, aislamiento
// entre usuarios, idempotencia, errores HTTP y respuestas tardías.

import test from 'node:test';
import assert from 'node:assert/strict';

import { createApiServices } from '../../src/services/factories';
import { createHttpClient, type HttpClient } from '../../src/services/http/client';
import { ApiError } from '../../src/services/http/ApiError';
import {
  classifyOperationFailure,
  isAmbiguousFailure,
} from '../../src/services/operationFailure';
import { FinancialOperation } from '../../src/services/financialOperation';
import { IdempotencyKeyStore } from '../../src/utils/idempotency';
import { SessionManager } from '../../src/services/session/sessionManager';
import { MemorySessionStorage } from '../../src/services/session/storage';
import type { IdentityPlatformClient } from '../../src/services/session/identityPlatform';
import type { IdentityTokens } from '../../src/services/session/types';
import { mapMovements } from '../../src/services/mappers/movementMapper';
import { mapCategories } from '../../src/services/mappers/categoryMapper';
import { mapBudgets } from '../../src/services/mappers/budgetMapper';
import { mapGoals } from '../../src/services/mappers/goalMapper';
import { mapBeneficiaries } from '../../src/services/mappers/beneficiaryMapper';
import { mapAnalyticsCategories } from '../../src/services/mappers/analyticsMapper';
import { routeCategoryFailure } from '../../src/services/categorySubmission';
import { expSecondsFromNow, makeJwt } from './support/tokens';

const BASE_URL = 'https://api.journey.test';

interface FakeCall {
  readonly url: string;
  readonly init: RequestInit;
}

function jsonResponse(
  body: unknown,
  status = 200,
  headers: Record<string, string> = {},
): Response {
  const normalized = new Map(
    Object.entries({ 'content-type': 'application/json', ...headers }).map(
      ([key, value]) => [key.toLowerCase(), value] as const,
    ),
  );
  return {
    status,
    ok: status >= 200 && status < 300,
    headers: { get: (name: string) => normalized.get(name.toLowerCase()) ?? null },
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

interface FakeReply {
  readonly status: number;
  readonly body: unknown;
}

function problemReply(status: number, code: string, detail = 'error'): FakeReply {
  return {
    status,
    body: {
      type: `https://errors.nequitrampa.internal/${code.toLowerCase()}`,
      title: code,
      status,
      detail,
      code,
    },
  };
}

function problemResponse(status: number, code: string, detail = 'error'): Response {
  return replyResponse(problemReply(status, code, detail), {
    'content-type': 'application/problem+json',
  });
}

function replyResponse(
  reply: FakeReply,
  headers: Record<string, string> = {},
): Response {
  return jsonResponse(reply.body, reply.status, headers);
}

function headersOf(call: FakeCall): Record<string, string> {
  return (call.init.headers ?? {}) as Record<string, string>;
}

function bodyOf(call: FakeCall): Record<string, unknown> {
  if (typeof call.init.body !== 'string' || call.init.body.length === 0) return {};
  return JSON.parse(call.init.body) as Record<string, unknown>;
}

interface SimUser {
  readonly token: string;
  readonly uid: string;
  readonly clientId: string;
  readonly code: string;
  readonly name: string;
  balanceCents: number;
  readonly movements: Array<Record<string, unknown>>;
  readonly transfers: Array<Record<string, unknown>>;
  readonly recharges: Array<Record<string, unknown>>;
  cashEntries: Array<Record<string, unknown>>;
  cashAvailableCents: number;
  cashIncomeCents: number;
  cashExpenseCents: number;
  readonly categories: Array<Record<string, unknown>>;
  readonly budgets: Array<Record<string, unknown>>;
  readonly goals: Array<Record<string, unknown>>;
  readonly beneficiaries: Array<Record<string, unknown>>;
}

const MONTHS_ES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
] as const;

function periodLabel(period: string): string {
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(period);
  if (!match) return period;
  return `${MONTHS_ES[Number(match[2]) - 1]} ${match[1]}`;
}

function periodOf(date: string): string {
  return date.slice(0, 7);
}

function seedCategory(
  id: string,
  name: string,
  type: 'gasto' | 'ingreso',
  isSystem: boolean,
): Record<string, unknown> {
  const now = new Date().toISOString();
  return {
    id,
    name,
    type,
    isSystem,
    active: true,
    currency: 'COP',
    createdAt: now,
    updatedAt: now,
  };
}

interface CashReplay {
  readonly hash: string;
  readonly body: unknown;
  readonly movementId: string;
}

interface StoredIdempotency {
  readonly hash: string;
  readonly status: number;
  readonly body: unknown;
}

function createUser(
  token: string,
  uid: string,
  clientId: string,
  code: string,
  name: string,
  balanceCents = 500_000,
): SimUser {
  return {
    token,
    uid,
    clientId,
    code,
    name,
    balanceCents,
    movements: [],
    transfers: [],
    recharges: [],
    cashEntries: [],
    cashAvailableCents: 0,
    cashIncomeCents: 0,
    cashExpenseCents: 0,
    categories: [
      seedCategory('cat-sys-gasto', 'Mercado', 'gasto', true),
      seedCategory('cat-sys-ingreso', 'Salario', 'ingreso', true),
    ],
    budgets: [],
    goals: [],
    beneficiaries: [],
  };
}

/**
 * Backend simulado con estado: cada token identifica un usuario real distinto.
 * Nunca comparte saldos, movimientos ni claves de idempotencia entre usuarios.
 */
class SimulatedBackend {
  readonly calls: FakeCall[] = [];
  readonly transferKeys: Array<{ uid: string; key: string }> = [];
  allowSimulatedRecharges = true;
  failNextTransferWith: number | null = null;
  private readonly users: SimUser[];
  private readonly revoked = new Set<string>();
  private readonly idempotency = new Map<string, StoredIdempotency>();
  private readonly cashReplays = new Map<string, CashReplay>();
  private failNext: {
    readonly method: string;
    readonly prefix: string;
    readonly status: number;
    readonly code: string;
  } | null = null;
  private sequence = 0;

  constructor(users: SimUser[]) {
    this.users = users;
  }

  readonly fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const call: FakeCall = { url: String(input), init: init ?? {} };
    this.calls.push(call);
    return this.route(call);
  }) as unknown as typeof fetch;

  /** Hace fallar una sola petición que coincida, para probar estados HTTP. */
  failNextRequest(
    method: string,
    prefix: string,
    status: number,
    code = 'UPSTREAM_UNAVAILABLE',
  ): void {
    this.failNext = { method, prefix, status, code };
  }

  revoke(token: string): void {
    this.revoked.add(token);
  }

  userFor(token: string | undefined): SimUser | null {
    if (!token) return null;
    if (this.revoked.has(token)) return null;
    return this.users.find((user) => user.token === token) ?? null;
  }

  private async route(call: FakeCall): Promise<Response> {
    const url = new URL(call.url);
    const method = call.init.method ?? 'GET';
    const path = url.pathname;
    const authorization = headersOf(call).Authorization ?? '';
    const token = authorization.startsWith('Bearer ')
      ? authorization.slice('Bearer '.length)
      : undefined;
    const user = this.userFor(token);

    if (!user) {
      return problemResponse(401, 'UNAUTHORIZED', 'Sesión inválida o vencida.');
    }

    if (
      this.failNext &&
      method === this.failNext.method &&
      path.startsWith(this.failNext.prefix)
    ) {
      const failure = this.failNext;
      this.failNext = null;
      return problemResponse(failure.status, failure.code);
    }

    if (method === 'GET' && path === '/v1/wallet/balance') {
      return jsonResponse({
        walletId: `wallet-${user.uid}`,
        clientId: user.clientId,
        availableBalance: user.balanceCents / 100,
        availableBalanceCents: user.balanceCents,
        currency: 'COP',
        asOfTimestamp: new Date().toISOString(),
        sourceAuthority: 'SPANNER',
      });
    }

    if (method === 'GET' && path === '/v1/movements') {
      return jsonResponse({
        clientId: user.clientId,
        count: user.movements.length,
        limit: Number(url.searchParams.get('limit') ?? 50),
        items: user.movements,
      });
    }

    if (method === 'GET' && path === '/v1/transfers') {
      return jsonResponse(user.transfers);
    }

    if (method === 'POST' && path === '/v1/transfers') {
      return this.createTransfer(user, call);
    }

    if (method === 'GET' && path.match(/^\/v1\/transfers\/[^/]+$/)) {
      const id = decodeURIComponent(path.split('/')[3]);
      return this.getTransfer(user, id);
    }

    if (method === 'GET' && path.match(/^\/v1\/transfers\/[^/]+\/receipt$/)) {
      const id = decodeURIComponent(path.split('/')[3]);
      return this.getReceipt(user, id);
    }

    if (method === 'GET' && path === '/v1/recharges') {
      return jsonResponse(user.recharges);
    }

    if (method === 'POST' && path === '/v1/recharges') {
      return this.createRecharge(user, call);
    }

    if (method === 'GET' && path === '/v1/beneficiaries') {
      return jsonResponse(
        user.beneficiaries.map((beneficiary) =>
          this.beneficiaryDto(beneficiary),
        ),
      );
    }

    if (method === 'POST' && path === '/v1/beneficiaries') {
      return this.createBeneficiary(user, call);
    }

    if (method === 'GET' && path.match(/^\/v1\/beneficiaries\/[^/]+$/)) {
      const id = decodeURIComponent(path.split('/')[3]);
      const beneficiary = user.beneficiaries.find((item) => item.id === id);
      return beneficiary
        ? jsonResponse(this.beneficiaryDto(beneficiary))
        : problemResponse(404, 'BENEFICIARY_NOT_FOUND');
    }

    if (method === 'DELETE' && path.match(/^\/v1\/beneficiaries\/[^/]+$/)) {
      return this.deleteBeneficiary(user, decodeURIComponent(path.split('/')[3]));
    }

    if (method === 'GET' && path === '/v1/cash/balance') {
      return jsonResponse(this.cashBalance(user));
    }

    if (method === 'GET' && path === '/v1/cash/movements') {
      return jsonResponse(user.cashEntries);
    }

    if (method === 'POST' && path === '/v1/cash/movements') {
      return this.createCashMovement(user, call);
    }

    if (method === 'GET' && path === '/v1/categories') {
      return jsonResponse(
        this.listCategories(user, url.searchParams.get('includeInactive') === 'true'),
      );
    }

    if (method === 'POST' && path === '/v1/categories') {
      return this.createCategory(user, call);
    }

    if (method === 'PATCH' && path.match(/^\/v1\/categories\/[^/]+$/)) {
      return this.updateCategory(user, decodeURIComponent(path.split('/')[3]), call);
    }

    if (method === 'DELETE' && path.match(/^\/v1\/categories\/[^/]+$/)) {
      return this.deactivateCategory(user, decodeURIComponent(path.split('/')[3]));
    }

    if (method === 'GET' && path === '/v1/budgets') {
      return jsonResponse(this.listBudgets(user, url.searchParams.get('period')));
    }

    if (method === 'POST' && path === '/v1/budgets') {
      return this.createBudget(user, call);
    }

    if (method === 'GET' && path.match(/^\/v1\/budgets\/[^/]+$/)) {
      return this.getBudget(user, decodeURIComponent(path.split('/')[3]));
    }

    if (method === 'PATCH' && path.match(/^\/v1\/budgets\/[^/]+$/)) {
      return this.updateBudget(user, decodeURIComponent(path.split('/')[3]), call);
    }

    if (method === 'GET' && path === '/v1/goals') {
      return jsonResponse(user.goals.map((goal) => this.goalDto(goal)));
    }

    if (method === 'POST' && path === '/v1/goals') {
      return this.createGoal(user, call);
    }

    if (method === 'GET' && path.match(/^\/v1\/goals\/[^/]+$/)) {
      const id = decodeURIComponent(path.split('/')[3]);
      const goal = user.goals.find((item) => item.id === id);
      return goal
        ? jsonResponse(this.goalDto(goal))
        : problemResponse(404, 'GOAL_NOT_FOUND');
    }

    if (method === 'PATCH' && path.match(/^\/v1\/goals\/[^/]+$/)) {
      return this.updateGoal(user, decodeURIComponent(path.split('/')[3]), call);
    }

    if (method === 'GET' && path === '/v1/analytics/summary') {
      return jsonResponse(this.analyticsSummary(user, url.searchParams.get('period')));
    }

    if (method === 'GET' && path === '/v1/analytics/categories') {
      return jsonResponse(
        this.analyticsCategories(user, url.searchParams.get('period')),
      );
    }

    if (method === 'GET' && path === '/v1/analytics/trends') {
      return jsonResponse(this.analyticsTrends(user, url.searchParams.get('period')));
    }

    return problemResponse(404, 'NOT_FOUND', 'Recurso no encontrado.');
  }

  private idempotent(
    user: SimUser,
    call: FakeCall,
    send: () => FakeReply,
  ): Response {
    const key = headersOf(call)['Idempotency-Key'];
    if (!key) return problemResponse(400, 'IDEMPOTENCY_KEY_REQUIRED');

    const scope = `${user.uid}:${call.init.method}:${new URL(call.url).pathname}`;
    const id = `${scope}:${key}`;
    const hash = JSON.stringify(bodyOf(call));
    const previous = this.idempotency.get(id);
    if (previous) {
      if (previous.hash !== hash) {
        return problemResponse(409, 'idempotency_key_conflict');
      }
      return jsonResponse(previous.body, previous.status, {
        'Idempotent-Replayed': 'true',
      });
    }

    const reply = send();
    if (reply.status >= 200 && reply.status < 300) {
      this.idempotency.set(id, {
        hash,
        status: reply.status,
        body: reply.body,
      });
    }
    return replyResponse(reply);
  }

  private createTransfer(user: SimUser, call: FakeCall): Response {
    const key = headersOf(call)['Idempotency-Key'];
    if (key) this.transferKeys.push({ uid: user.uid, key });

    if (this.failNextTransferWith !== null) {
      const status = this.failNextTransferWith;
      this.failNextTransferWith = null;
      return problemResponse(status, 'UPSTREAM_UNAVAILABLE');
    }

    return this.idempotent(user, call, () => {
      const body = bodyOf(call);
      const amount = Number(body.amount);
      const amountCents = Math.round(amount * 100);
      if (!Number.isFinite(amount) || amountCents <= 0) {
        return problemReply(422, 'VALIDATION_ERROR');
      }
      if (amountCents > user.balanceCents) {
        return problemReply(422, 'INSUFFICIENT_FUNDS');
      }

      this.sequence += 1;
      const transferId = `TRF-${String(this.sequence).padStart(4, '0')}`;
      const operationId = `op-trf-${this.sequence}`;
      const timestamp = new Date().toISOString();
      const destinationCode = String(body.destinationTransferCode ?? '');
      const destination = this.users.find((candidate) => candidate.code === destinationCode);
      if (!destination) {
        return problemReply(404, 'DESTINATION_NOT_FOUND');
      }

      user.balanceCents -= amountCents;
      destination.balanceCents += amountCents;

      const transfer: Record<string, unknown> = {
        transferId,
        originClientId: user.clientId,
        destinationClientId: destination.clientId,
        destinationTransferCode: destinationCode,
        amount,
        amountCents,
        currency: 'COP',
        status: 'COMPLETED',
        ledgerOperationId: operationId,
        timestamp,
        description: body.description ?? null,
      };
      user.transfers.unshift(transfer);

      user.movements.unshift({
        eventId: `evt-${operationId}`,
        operationId,
        type: 'TRANSFER_COMPLETED',
        amountCents: -amountCents,
        currency: 'COP',
        counterpartyClientId: destination.clientId,
        description: body.description ?? null,
        balanceAfterCents: user.balanceCents,
        occurredAt: timestamp,
        syncStatus: 'SYNCED',
        status: 'COMPLETED',
      });
      destination.movements.unshift({
        eventId: `evt-in-${operationId}`,
        operationId: `in-${operationId}`,
        type: 'TRANSFER_COMPLETED',
        amountCents,
        currency: 'COP',
        counterpartyClientId: user.clientId,
        description: body.description ?? null,
        balanceAfterCents: destination.balanceCents,
        occurredAt: timestamp,
        syncStatus: 'SYNCED',
        status: 'COMPLETED',
      });

      return { status: 201, body: transfer };
    });
  }

  private getTransfer(user: SimUser, id: string): Response {
    const transfer = user.transfers.find((item) => item.transferId === id);
    if (!transfer) return problemResponse(404, 'NOT_FOUND');
    return jsonResponse(transfer);
  }

  private getReceipt(user: SimUser, id: string): Response {
    // El backend busca el comprobante por id y luego autoriza: un comprobante
    // ajeno existe, pero devuelve 403 y nunca sus datos.
    const transfer = this.users
      .flatMap((candidate) => candidate.transfers)
      .find((item) => item.transferId === id);
    if (!transfer) return problemResponse(404, 'NOT_FOUND');
    if (transfer.originClientId !== user.clientId) {
      return problemResponse(403, 'FORBIDDEN');
    }
    return jsonResponse({
      receiptNumber: `RCP-${id}`,
      transferId: id,
      originMaskedTransferCode: 'TRF***0001',
      destinationMaskedTransferCode: 'TRF***0002',
      amount: transfer.amount,
      currency: 'COP',
      completedAt: transfer.timestamp,
      authorizationCode: 'AUTH-TEST-1',
      status: 'COMPLETED',
    });
  }

  private createRecharge(user: SimUser, call: FakeCall): Response {
    return this.idempotent(user, call, () => {
      const body = bodyOf(call);
      const paymentMethod = String(body.paymentMethod ?? '');
      if (
        paymentMethod.startsWith('SIMULATED_') &&
        !this.allowSimulatedRecharges
      ) {
        return problemReply(403, 'SIMULATED_METHOD_NOT_ALLOWED');
      }

      const amount = Number(body.amount);
      const amountCents = Math.round(amount * 100);
      if (!Number.isFinite(amount) || amountCents <= 0) {
        return problemReply(422, 'VALIDATION_ERROR');
      }

      this.sequence += 1;
      const rechargeId = `RCH-${String(this.sequence).padStart(4, '0')}`;
      user.balanceCents += amountCents;
      const recharge: Record<string, unknown> = {
        rechargeId,
        clientId: user.clientId,
        amount,
        amountCents,
        currency: 'COP',
        paymentMethod,
        status: 'COMPLETED',
        ledgerOperationId: `op-rch-${this.sequence}`,
        timestamp: new Date().toISOString(),
      };
      user.recharges.unshift(recharge);
      user.movements.unshift({
        eventId: `evt-${rechargeId}`,
        operationId: recharge.ledgerOperationId,
        type: 'RECHARGE_COMPLETED',
        amountCents,
        currency: 'COP',
        counterpartyClientId: null,
        description: null,
        balanceAfterCents: user.balanceCents,
        occurredAt: recharge.timestamp,
        syncStatus: 'SYNCED',
        status: 'COMPLETED',
      });
      return { status: 201, body: recharge };
    });
  }

  private cashBalance(user: SimUser): Record<string, unknown> {
    return {
      availableCents: user.cashAvailableCents,
      incomeCents: user.cashIncomeCents,
      expenseCents: user.cashExpenseCents,
      movementCount: user.cashEntries.length,
      currency: 'COP',
      updatedAt: new Date().toISOString(),
    };
  }

  private createCashMovement(user: SimUser, call: FakeCall): Response {
    const key = headersOf(call)['Idempotency-Key'];
    if (!key) return problemResponse(400, 'IDEMPOTENCY_KEY_REQUIRED');

    const body = bodyOf(call);
    const hash = JSON.stringify(body);
    const replayId = `${user.uid}:${key}`;
    const previous = this.cashReplays.get(replayId);
    if (previous) {
      if (previous.hash !== hash) {
        return problemResponse(409, 'idempotency_key_conflict');
      }
      const existing = user.cashEntries.find(
        (entry) => entry.id === previous.movementId,
      );
      return jsonResponse(
        { movement: existing, balance: this.cashBalance(user) },
        201,
        { 'Idempotent-Replayed': 'true' },
      );
    }

    const direction = String(body.direction ?? '');
    const amountCents = Number(body.amountCents);
    if (
      (direction !== 'income' && direction !== 'expense') ||
      !Number.isSafeInteger(amountCents) ||
      amountCents <= 0
    ) {
      return problemResponse(422, 'VALIDATION_ERROR');
    }
    if (direction === 'expense' && amountCents > user.cashAvailableCents) {
      return problemResponse(422, 'CASH_INSUFFICIENT');
    }

    const categoryId =
      typeof body.categoryId === 'string' && body.categoryId.length > 0
        ? body.categoryId
        : null;
    const category = categoryId
      ? user.categories.find(
          (candidate) => candidate.id === categoryId && candidate.active === true,
        )
      : null;
    if (categoryId && !category) {
      return problemResponse(404, 'CATEGORY_NOT_FOUND');
    }

    this.sequence += 1;
    const id = `CASH-${this.sequence}`;
    if (direction === 'income') {
      user.cashAvailableCents += amountCents;
      user.cashIncomeCents += amountCents;
    } else {
      user.cashAvailableCents -= amountCents;
      user.cashExpenseCents += amountCents;
    }
    const movement: Record<string, unknown> = {
      id,
      direction,
      amountCents,
      categoryId,
      categoryName: category ? category.name : null,
      note: body.note ?? null,
      occurredOn: body.occurredOn ?? new Date().toISOString().slice(0, 10),
      balanceAfterCents: user.cashAvailableCents,
      createdAt: new Date().toISOString(),
    };
    user.cashEntries.unshift(movement);
    this.cashReplays.set(replayId, { hash, body, movementId: id });

    return jsonResponse(
      { movement, balance: this.cashBalance(user) },
      201,
    );
  }

  // ── Beneficiarios ───────────────────────────────────────────

  private beneficiaryDto(
    beneficiary: Record<string, unknown>,
  ): Record<string, unknown> {
    return {
      id: beneficiary.id,
      name: beneficiary.name,
      transferCode: beneficiary.transferCode,
      createdAt: beneficiary.createdAt,
    };
  }

  private createBeneficiary(user: SimUser, call: FakeCall): Response {
    const body = bodyOf(call);
    const name = normalizeName(body.name);
    if (name.length < 2 || name.length > 60) {
      return problemResponse(422, 'VALIDATION_ERROR');
    }
    const rawCode = String(body.transferCode ?? '').trim().toUpperCase();
    if (!/^[A-Za-z0-9_-]{1,20}$/.test(rawCode)) {
      return problemResponse(422, 'VALIDATION_ERROR');
    }
    if (rawCode === user.code) {
      return problemResponse(422, 'BENEFICIARY_SELF');
    }
    const destination = this.users.find(
      (candidate) => candidate.code === rawCode,
    );
    if (!destination) {
      return problemResponse(404, 'BENEFICIARY_CODE_NOT_FOUND');
    }
    if (
      user.beneficiaries.some(
        (beneficiary) => beneficiary.transferCode === rawCode,
      )
    ) {
      return problemResponse(409, 'BENEFICIARY_DUPLICATE');
    }

    this.sequence += 1;
    const now = new Date().toISOString();
    const beneficiary: Record<string, unknown> = {
      id: `ben-${this.sequence}`,
      name,
      transferCode: rawCode,
      destinationClientId: destination.clientId,
      createdAt: now,
      updatedAt: now,
    };
    user.beneficiaries.push(beneficiary);
    return jsonResponse(this.beneficiaryDto(beneficiary), 201);
  }

  private deleteBeneficiary(user: SimUser, id: string): Response {
    const index = user.beneficiaries.findIndex((item) => item.id === id);
    if (index < 0) return problemResponse(404, 'BENEFICIARY_NOT_FOUND');
    const [removed] = user.beneficiaries.splice(index, 1);
    return jsonResponse({ id: removed.id, deleted: true });
  }

  // ── Categorías ──────────────────────────────────────────────

  private categoryDto(
    user: SimUser,
    category: Record<string, unknown>,
  ): Record<string, unknown> {
    const related = user.cashEntries.filter(
      (entry) => entry.categoryId === category.id,
    );
    return {
      id: category.id,
      name: category.name,
      type: category.type,
      isSystem: category.isSystem,
      active: category.active,
      movementsCount: related.length,
      totalAmountCents: related.reduce(
        (total, entry) => total + Number(entry.amountCents),
        0,
      ),
      currency: 'COP',
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
    };
  }

  private listCategories(
    user: SimUser,
    includeInactive: boolean,
  ): Array<Record<string, unknown>> {
    return user.categories
      .filter((category) => includeInactive || category.active === true)
      .map((category) => this.categoryDto(user, category));
  }

  private createCategory(user: SimUser, call: FakeCall): Response {
    const body = bodyOf(call);
    const name = normalizeName(body.name);
    const type = String(body.type ?? '');
    if (name.length < 2 || name.length > 40 || !isCategoryType(type)) {
      return problemResponse(422, 'VALIDATION_ERROR');
    }
    if (this.hasCategory(user, name, type)) {
      return problemResponse(409, 'CATEGORY_DUPLICATE');
    }

    this.sequence += 1;
    const now = new Date().toISOString();
    const category: Record<string, unknown> = {
      id: `cat-${this.sequence}`,
      name,
      type,
      isSystem: false,
      active: true,
      currency: 'COP',
      createdAt: now,
      updatedAt: now,
    };
    user.categories.push(category);
    return jsonResponse(this.categoryDto(user, category), 201);
  }

  private hasCategory(
    user: SimUser,
    name: string,
    type: string,
    exceptId?: string,
  ): boolean {
    return user.categories.some(
      (category) =>
        category.active === true &&
        category.id !== exceptId &&
        category.type === type &&
        String(category.name).toLowerCase() === name.toLowerCase(),
    );
  }

  private updateCategory(
    user: SimUser,
    id: string,
    call: FakeCall,
  ): Response {
    const category = user.categories.find((item) => item.id === id);
    if (!category) return problemResponse(404, 'CATEGORY_NOT_FOUND');
    if (category.isSystem === true) {
      return problemResponse(403, 'SYSTEM_CATEGORY_IMMUTABLE');
    }

    const body = bodyOf(call);
    const hasName = body.name !== undefined;
    const hasType = body.type !== undefined;
    if (!hasName && !hasType) {
      return problemResponse(422, 'VALIDATION_ERROR');
    }
    if (hasType && String(body.type) !== category.type) {
      return problemResponse(422, 'CATEGORY_TYPE_IMMUTABLE');
    }

    const name = hasName ? normalizeName(body.name) : String(category.name);
    if (name.length < 2 || name.length > 40) {
      return problemResponse(422, 'VALIDATION_ERROR');
    }
    if (this.hasCategory(user, name, String(category.type), id)) {
      return problemResponse(409, 'CATEGORY_DUPLICATE');
    }

    category.name = name;
    category.updatedAt = new Date().toISOString();
    return jsonResponse(this.categoryDto(user, category));
  }

  private deactivateCategory(user: SimUser, id: string): Response {
    const category = user.categories.find((item) => item.id === id);
    if (!category) return problemResponse(404, 'CATEGORY_NOT_FOUND');
    if (category.isSystem === true) {
      return problemResponse(403, 'SYSTEM_CATEGORY_IMMUTABLE');
    }
    category.active = false;
    category.updatedAt = new Date().toISOString();
    return jsonResponse(null, 204);
  }

  // ── Presupuestos ────────────────────────────────────────────

  private budgetDto(
    user: SimUser,
    budget: Record<string, unknown>,
  ): Record<string, unknown> {
    const period = String(budget.period);
    const spentCents = user.cashEntries
      .filter(
        (entry) =>
          entry.direction === 'expense' &&
          entry.categoryId === budget.categoryId &&
          periodOf(String(entry.occurredOn)) === period,
      )
      .reduce((total, entry) => total + Number(entry.amountCents), 0);
    const limitCents = Number(budget.limitCents);
    const percent = Math.round((spentCents / limitCents) * 100);
    const category = user.categories.find(
      (candidate) => candidate.id === budget.categoryId,
    );
    return {
      id: budget.id,
      categoryId: budget.categoryId,
      categoryName: category ? category.name : null,
      period,
      limitCents,
      spentCents,
      remainingCents: limitCents - spentCents,
      percent,
      health: percent >= 100 ? 'exceeded' : percent >= 80 ? 'warning' : 'on-track',
      currency: 'COP',
      active: budget.active,
      createdAt: budget.createdAt,
      updatedAt: budget.updatedAt,
    };
  }

  private listBudgets(user: SimUser, period: string | null): Array<Record<string, unknown>> {
    return user.budgets
      .filter((budget) => budget.active === true)
      .filter((budget) => !period || budget.period === period)
      .map((budget) => this.budgetDto(user, budget));
  }

  private createBudget(user: SimUser, call: FakeCall): Response {
    const body = bodyOf(call);
    const categoryId = String(body.categoryId ?? '');
    const period = String(body.period ?? '');
    const limitCents = Number(body.limitCents);
    const category = user.categories.find(
      (candidate) => candidate.id === categoryId && candidate.active === true,
    );
    if (!category) return problemResponse(422, 'INVALID_CATEGORY');
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(period)) {
      return problemResponse(422, 'VALIDATION_ERROR');
    }
    if (!Number.isSafeInteger(limitCents) || limitCents < 1) {
      return problemResponse(422, 'VALIDATION_ERROR');
    }
    if (
      user.budgets.some(
        (budget) =>
          budget.active === true &&
          budget.categoryId === categoryId &&
          budget.period === period,
      )
    ) {
      return problemResponse(409, 'BUDGET_DUPLICATE');
    }

    this.sequence += 1;
    const now = new Date().toISOString();
    const budget: Record<string, unknown> = {
      id: `bgt-${this.sequence}`,
      categoryId,
      period,
      limitCents,
      active: true,
      createdAt: now,
      updatedAt: now,
    };
    user.budgets.push(budget);
    return jsonResponse(this.budgetDto(user, budget), 201);
  }

  private getBudget(user: SimUser, id: string): Response {
    const budget = user.budgets.find((item) => item.id === id);
    if (!budget) return problemResponse(404, 'BUDGET_NOT_FOUND');

    const dto = this.budgetDto(user, budget);
    const period = String(budget.period);
    const expenses = user.cashEntries
      .filter(
        (entry) =>
          entry.direction === 'expense' &&
          entry.categoryId === budget.categoryId &&
          periodOf(String(entry.occurredOn)) === period,
      )
      .map((entry) => ({
        id: entry.id,
        merchant: entry.note ?? null,
        amountCents: entry.amountCents,
        occurredAt: `${entry.occurredOn}T12:00:00Z`,
      }));
    const remaining = Number(dto.remainingCents);
    return jsonResponse({
      ...dto,
      daysRemaining: 10,
      dailySuggestedCents: remaining > 0 ? Math.floor(remaining / 10) : 0,
      expenses,
    });
  }

  private updateBudget(
    user: SimUser,
    id: string,
    call: FakeCall,
  ): Response {
    const budget = user.budgets.find((item) => item.id === id);
    if (!budget) return problemResponse(404, 'BUDGET_NOT_FOUND');
    const body = bodyOf(call);
    const limitCents = Number(body.limitCents);
    if (!Number.isSafeInteger(limitCents) || limitCents < 1) {
      return problemResponse(422, 'VALIDATION_ERROR');
    }
    budget.limitCents = limitCents;
    budget.updatedAt = new Date().toISOString();
    return jsonResponse(this.budgetDto(user, budget));
  }

  // ── Metas ───────────────────────────────────────────────────

  private goalDto(goal: Record<string, unknown>): Record<string, unknown> {
    const targetCents = Number(goal.targetCents);
    const savedCents = Number(goal.savedCents);
    const targetDate = String(goal.targetDate);
    const daysRemaining = Math.max(
      0,
      Math.ceil(
        (Date.parse(`${targetDate}T00:00:00Z`) - Date.now()) / 86_400_000,
      ) || 0,
    );
    const percent = Math.min(
      100,
      Math.round((savedCents / targetCents) * 100),
    );
    return {
      id: goal.id,
      name: goal.name,
      targetCents,
      savedCents,
      percent,
      isAchieved: savedCents >= targetCents,
      targetDate,
      daysRemaining,
      currency: 'COP',
      active: goal.active,
      createdAt: goal.createdAt,
      updatedAt: goal.updatedAt,
    };
  }

  private createGoal(user: SimUser, call: FakeCall): Response {
    const body = bodyOf(call);
    const name = normalizeName(body.name);
    const targetCents = Number(body.targetCents);
    const targetDate = String(body.targetDate ?? '');
    if (name.length < 2 || name.length > 80) {
      return problemResponse(422, 'VALIDATION_ERROR');
    }
    if (!Number.isSafeInteger(targetCents) || targetCents < 1) {
      return problemResponse(422, 'VALIDATION_ERROR');
    }
    if (!isFutureDateKey(targetDate)) {
      return problemResponse(422, 'INVALID_TARGET_DATE');
    }
    if (
      user.goals.some(
        (goal) =>
          goal.active === true &&
          String(goal.name).toLowerCase() === name.toLowerCase(),
      )
    ) {
      return problemResponse(409, 'GOAL_DUPLICATE');
    }

    this.sequence += 1;
    const now = new Date().toISOString();
    const goal: Record<string, unknown> = {
      id: `goal-${this.sequence}`,
      name,
      targetCents,
      savedCents: 0,
      targetDate,
      active: true,
      createdAt: now,
      updatedAt: now,
    };
    user.goals.push(goal);
    return jsonResponse(this.goalDto(goal), 201);
  }

  private updateGoal(user: SimUser, id: string, call: FakeCall): Response {
    const goal = user.goals.find((item) => item.id === id);
    if (!goal) return problemResponse(404, 'GOAL_NOT_FOUND');

    const body = bodyOf(call);
    const hasName = body.name !== undefined;
    const hasTarget = body.targetCents !== undefined;
    const hasDate = body.targetDate !== undefined;
    const hasSaved = body.savedCents !== undefined;
    if (!hasName && !hasTarget && !hasDate && !hasSaved) {
      return problemResponse(422, 'VALIDATION_ERROR');
    }

    if (hasName) {
      const name = normalizeName(body.name);
      if (name.length < 2 || name.length > 80) {
        return problemResponse(422, 'VALIDATION_ERROR');
      }
      const duplicate = user.goals.some(
        (other) =>
          other.id !== id &&
          other.active === true &&
          String(other.name).toLowerCase() === name.toLowerCase(),
      );
      if (duplicate) return problemResponse(409, 'GOAL_DUPLICATE');
      goal.name = name;
    }
    if (hasTarget) {
      const targetCents = Number(body.targetCents);
      if (!Number.isSafeInteger(targetCents) || targetCents < 1) {
        return problemResponse(422, 'VALIDATION_ERROR');
      }
      goal.targetCents = targetCents;
    }
    if (hasDate) {
      const targetDate = String(body.targetDate);
      if (!isFutureDateKey(targetDate)) {
        return problemResponse(422, 'INVALID_TARGET_DATE');
      }
      goal.targetDate = targetDate;
    }
    // `savedCents` es progreso declarado: no mueve saldo ni crea movimientos.
    if (hasSaved) {
      const savedCents = Number(body.savedCents);
      if (!Number.isSafeInteger(savedCents) || savedCents < 0) {
        return problemResponse(422, 'VALIDATION_ERROR');
      }
      goal.savedCents = savedCents;
    }
    goal.updatedAt = new Date().toISOString();
    return jsonResponse(this.goalDto(goal));
  }

  // ── Analítica ───────────────────────────────────────────────

  private currentPeriod(): string {
    return new Date().toISOString().slice(0, 7);
  }

  private confirmedMovements(user: SimUser): Array<{
    categoryId: string | null;
    amountCents: number;
    occurredAt: string;
  }> {
    const wallet = user.movements.map((movement) => ({
      categoryId: null,
      amountCents: Number(movement.amountCents),
      occurredAt: String(movement.occurredAt),
    }));
    const cash = user.cashEntries.map((entry) => ({
      categoryId:
        typeof entry.categoryId === 'string' ? entry.categoryId : null,
      amountCents:
        entry.direction === 'income'
          ? Number(entry.amountCents)
          : -Number(entry.amountCents),
      occurredAt: `${entry.occurredOn}T12:00:00Z`,
    }));
    return [...wallet, ...cash];
  }

  private previousPeriod(period: string): string {
    const [year, month] = period.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 2, 1));
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
  }

  private analyticsSummary(user: SimUser, requested: string | null): Record<string, unknown> {
    const period = requested ?? this.currentPeriod();
    const previous = this.previousPeriod(period);
    const totals = (target: string) => {
      const rows = this.confirmedMovements(user).filter(
        (movement) => periodOf(movement.occurredAt) === target,
      );
      const incomeCents = rows
        .filter((movement) => movement.amountCents > 0)
        .reduce((total, movement) => total + movement.amountCents, 0);
      const expenseCents = rows
        .filter((movement) => movement.amountCents < 0)
        .reduce((total, movement) => total - movement.amountCents, 0);
      return { rows, incomeCents, expenseCents };
    };
    const current = totals(period);
    const before = totals(previous);
    const change = (now: number, then: number): number | null =>
      then === 0 ? null : Math.round(((now - then) / then) * 100);
    return {
      period,
      periodLabel: periodLabel(period),
      currency: 'COP',
      incomeCents: current.incomeCents,
      expenseCents: current.expenseCents,
      netCents: current.incomeCents - current.expenseCents,
      movementCount: current.rows.length,
      averageDailyExpenseCents: Math.round(current.expenseCents / 30),
      previousPeriod: previous,
      previousPeriodLabel: periodLabel(previous),
      previousIncomeCents: before.incomeCents,
      previousExpenseCents: before.expenseCents,
      incomeChangePercent: change(current.incomeCents, before.incomeCents),
      expenseChangePercent: change(current.expenseCents, before.expenseCents),
      generatedAt: new Date().toISOString(),
    };
  }

  private analyticsCategories(
    user: SimUser,
    requested: string | null,
  ): Record<string, unknown> {
    const period = requested ?? this.currentPeriod();
    const expenses = this.confirmedMovements(user).filter(
      (movement) =>
        movement.amountCents < 0 && periodOf(movement.occurredAt) === period,
    );
    const totalExpenseCents = expenses.reduce(
      (total, movement) => total - movement.amountCents,
      0,
    );
    const grouped = new Map<string | null, { amountCents: number; count: number }>();
    for (const movement of expenses) {
      const current = grouped.get(movement.categoryId) ?? {
        amountCents: 0,
        count: 0,
      };
      current.amountCents += -movement.amountCents;
      current.count += 1;
      grouped.set(movement.categoryId, current);
    }

    const categories = [...grouped.entries()]
      .filter(([categoryId]) => categoryId !== null)
      .map(([categoryId, value]) => {
        const category = user.categories.find(
          (candidate) => candidate.id === categoryId,
        );
        return {
          categoryId,
          name: category ? category.name : 'Sin categoría',
          amountCents: value.amountCents,
          percent:
            totalExpenseCents === 0
              ? 0
              : Math.round((value.amountCents / totalExpenseCents) * 100),
          movementCount: value.count,
        };
      })
      .sort((left, right) => right.amountCents - left.amountCents);

    return {
      period,
      periodLabel: periodLabel(period),
      currency: 'COP',
      totalExpenseCents,
      uncategorizedCents: grouped.get(null)?.amountCents ?? 0,
      categories,
    };
  }

  private analyticsTrends(
    user: SimUser,
    requested: string | null,
  ): Record<string, unknown> {
    const period = requested ?? this.currentPeriod();
    const rows = this.confirmedMovements(user).filter(
      (movement) => periodOf(movement.occurredAt) === period,
    );
    const weeks = [1, 2, 3, 4, 5].map((week) => {
      const weekly = rows.filter((movement) => {
        const day = Number(movement.occurredAt.slice(8, 10)) || 1;
        return Math.min(5, Math.ceil(day / 7)) === week;
      });
      return {
        week,
        label: `Semana ${week}`,
        incomeCents: weekly
          .filter((movement) => movement.amountCents > 0)
          .reduce((total, movement) => total + movement.amountCents, 0),
        expenseCents: weekly
          .filter((movement) => movement.amountCents < 0)
          .reduce((total, movement) => total - movement.amountCents, 0),
      };
    });
    return {
      period,
      periodLabel: periodLabel(period),
      currency: 'COP',
      weeks,
    };
  }
}

function normalizeName(value: unknown): string {
  return String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ');
}

/** El backend rechaza fechas pasadas; el simulador replica esa regla. */
function isFutureDateKey(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const today = new Date().toISOString().slice(0, 10);
  return value >= today;
}

function isCategoryType(value: string): boolean {
  return value === 'gasto' || value === 'ingreso';
}

function clientFor(
  backend: SimulatedBackend,
  token: string,
  onUnauthorized?: () => void,
): HttpClient {
  return createHttpClient({
    baseUrl: BASE_URL,
    fetchImpl: backend.fetch,
    getAccessToken: () => token,
    timeoutMs: 5_000,
    onUnauthorized,
  });
}

function servicesFor(backend: SimulatedBackend, token: string) {
  return createApiServices(clientFor(backend, token));
}

function alice(): SimUser {
  return createUser('token-alice', 'uid-alice', 'client-alice', 'ALI-001', 'Alice', 500_000);
}

function bob(): SimUser {
  return createUser('token-bob', 'uid-bob', 'client-bob', 'BOB-001', 'Bob', 900_000);
}

test('journey: Alice consulta saldo, movimientos, transfiere y obtiene comprobante', async () => {
  const a = alice();
  const b = bob();
  const backend = new SimulatedBackend([a, b]);
  const services = servicesFor(backend, a.token);

  const initial = await services.wallet.getBalance();
  assert.equal(initial.clientId, 'client-alice');
  assert.equal(initial.availableBalanceCents, 500_000);

  const created = await services.transfers.create(
    {
      destinationTransferCode: 'BOB-001',
      amountCents: 250_000,
      description: 'Cena',
    },
    { idempotencyKey: 'intent-alice-1' },
  );
  assert.equal(created.transferId, 'TRF-0001');
  assert.equal(created.amountCents, 250_000);
  assert.equal(created.originClientId, 'client-alice');

  const after = await services.wallet.getBalance();
  assert.equal(after.availableBalanceCents, 250_000);

  const movements = mapMovements((await services.movements.list()).items);
  assert.equal(movements.length, 1);
  assert.equal(movements[0].type, 'TRANSFER_SENT');
  assert.equal(movements[0].title, 'Cena');
  assert.equal(movements[0].amountCents, -250_000);

  const receipt = await services.transfers.getReceipt(created.transferId);
  assert.equal(receipt.transferId, created.transferId);
  assert.equal(receipt.amountCents, 250_000);
  assert.equal(receipt.currency, 'COP');

  const transferHeaders = backend.calls
    .filter((call) => call.url.endsWith('/v1/transfers') && call.init.method === 'POST')
    .map(headersOf)[0];
  assert.equal(transferHeaders.Authorization, `Bearer ${a.token}`);
  assert.equal(transferHeaders['Idempotency-Key'], 'intent-alice-1');
});

test('journey: repetir la misma intención no duplica la transferencia y un cuerpo distinto choca', async () => {
  const a = alice();
  const backend = new SimulatedBackend([a, bob()]);
  const services = servicesFor(backend, a.token);
  const input = {
    destinationTransferCode: 'BOB-001',
    amountCents: 100_000,
    description: 'Mercado',
  };

  const first = await services.transfers.create(input, {
    idempotencyKey: 'intent-repeat-1',
  });
  const replay = await services.transfers.create(input, {
    idempotencyKey: 'intent-repeat-1',
  });

  assert.equal(first.transferId, replay.transferId);
  assert.equal(a.transfers.length, 1);
  assert.equal(a.balanceCents, 400_000);

  await assert.rejects(
    () =>
      services.transfers.create(
        { ...input, amountCents: 200_000 },
        { idempotencyKey: 'intent-repeat-1' },
      ),
    (error: unknown) =>
      error instanceof ApiError &&
      error.kind === 'conflict' &&
      error.problem.code === 'idempotency_key_conflict',
  );
  assert.equal(a.transfers.length, 1);
});

test('journey: un 503 conserva la clave y el reintento recupera el mismo resultado sin duplicar', async () => {
  const a = alice();
  const backend = new SimulatedBackend([a, bob()]);
  const services = servicesFor(backend, a.token);
  const store = new IdempotencyKeyStore();
  const operation = new FinancialOperation({
    scope: 'journey.transfers',
    keyStore: store,
  });
  const intent = 'ALI-001|BOB-001|100000|Viaje';

  backend.failNextTransferWith = 503;
  const uncertain = await operation.run(intent, (key) =>
    services.transfers.create(
      {
        destinationTransferCode: 'BOB-001',
        amountCents: 100_000,
        description: 'Viaje',
      },
      { idempotencyKey: key },
    ),
  );
  assert.equal(uncertain.status, 'uncertain');
  assert.equal(backend.transferKeys.length, 1);

  const confirmed = await operation.run(intent, (key) =>
    services.transfers.create(
      {
        destinationTransferCode: 'BOB-001',
        amountCents: 100_000,
        description: 'Viaje',
      },
      { idempotencyKey: key },
    ),
  );
  assert.equal(confirmed.status, 'confirmed');
  assert.equal(backend.transferKeys.length, 2);
  assert.equal(backend.transferKeys[0].key, backend.transferKeys[1].key);
  assert.equal(a.transfers.length, 1);
  assert.equal(a.balanceCents, 400_000);
});

test('journey: cada usuario ve solo sus datos y no puede leer comprobantes ajenos', async () => {
  const a = alice();
  const b = bob();
  const backend = new SimulatedBackend([a, b]);
  const aliceServices = servicesFor(backend, a.token);
  const bobServices = servicesFor(backend, b.token);

  const transfer = await aliceServices.transfers.create(
    {
      destinationTransferCode: 'BOB-001',
      amountCents: 100_000,
      description: 'Regalo',
    },
    { idempotencyKey: 'isolation-1' },
  );

  const bobBalance = await bobServices.wallet.getBalance();
  assert.equal(bobBalance.clientId, 'client-bob');
  assert.equal(bobBalance.availableBalanceCents, 1_000_000);

  const bobMovements = mapMovements((await bobServices.movements.list()).items);
  assert.equal(bobMovements.length, 1);
  assert.equal(bobMovements[0].type, 'TRANSFER_RECEIVED');

  await assert.rejects(
    () => bobServices.transfers.getReceipt(transfer.transferId),
    (error: unknown) =>
      error instanceof ApiError && error.kind === 'forbidden',
  );

  await assert.rejects(
    () => bobServices.transfers.getById(transfer.transferId),
    (error: unknown) => error instanceof ApiError && error.kind === 'not_found',
  );
});

test('journey: recarga confirmada, recarga simulada denegada y error de validación', async () => {
  const a = alice();
  const backend = new SimulatedBackend([a, bob()]);
  const services = servicesFor(backend, a.token);

  const recharge = await services.recharges.create(
    { amountCents: 150_000 },
    { idempotencyKey: 'recharge-ok-1' },
  );
  assert.equal(recharge.amountCents, 150_000);
  assert.equal(a.balanceCents, 650_000);

  backend.allowSimulatedRecharges = false;
  await assert.rejects(
    () =>
      services.recharges.create(
        { amountCents: 150_000 },
        { idempotencyKey: 'recharge-denied-1' },
      ),
    (error: unknown) => {
      if (!(error instanceof ApiError)) return false;
      assert.equal(error.problem.code, 'SIMULATED_METHOD_NOT_ALLOWED');
      assert.equal(classifyOperationFailure(error), 'forbidden');
      return error.kind === 'forbidden';
    },
  );
  assert.equal(a.balanceCents, 650_000);
});

test('journey: dos gastos de efectivo idénticos con claves distintas son legítimos; la misma clave no duplica', async () => {
  const a = alice();
  const backend = new SimulatedBackend([a, bob()]);
  const services = servicesFor(backend, a.token);
  const income = await services.cash.createMovement(
    { direction: 'income', amountCents: 500_000, note: 'Base' },
    { idempotencyKey: 'cash-income-1' },
  );
  assert.equal(income.balance.availableCents, 500_000);

  const body = {
    direction: 'expense' as const,
    amountCents: 20_000,
    note: 'Café',
    occurredOn: '2026-10-26',
  };
  const first = await services.cash.createMovement(body, {
    idempotencyKey: 'cash-expense-1',
  });
  const second = await services.cash.createMovement(body, {
    idempotencyKey: 'cash-expense-2',
  });

  assert.notEqual(first.movement.id, second.movement.id);
  // Un ingreso + dos gastos idénticos: la identidad es la clave, no el cuerpo.
  assert.equal(a.cashEntries.length, 3);
  assert.equal(a.cashAvailableCents, 460_000);

  const replay = await services.cash.createMovement(body, {
    idempotencyKey: 'cash-expense-1',
  });
  assert.equal(replay.movement.id, first.movement.id);
  assert.equal(a.cashEntries.length, 3);

  await assert.rejects(
    () =>
      services.cash.createMovement(
        { ...body, amountCents: 30_000 },
        { idempotencyKey: 'cash-expense-1' },
      ),
    (error: unknown) =>
      error instanceof ApiError &&
      error.kind === 'conflict' &&
      error.problem.code === 'idempotency_key_conflict',
  );
});

test('journey: un 401 limpia la sesión y la siguiente petición no lleva token', async () => {
  const idToken = makeJwt({
    user_id: 'uid-alice',
    client_id: 'client-alice',
    roles: ['CLIENTE'],
    exp: expSecondsFromNow(3600, Date.now()),
  });
  // El backend simulado valida el ID token emitido por Identity Platform.
  const a = createUser(idToken, 'uid-alice', 'client-alice', 'ALI-001', 'Alice', 500_000);
  const backend = new SimulatedBackend([a, bob()]);
  const storage = new MemorySessionStorage();
  const identity: IdentityPlatformClient = {
    async signInWithPassword(): Promise<IdentityTokens> {
      return {
        idToken,
        refreshToken: 'refresh-alice',
        expiresInSeconds: 3600,
      };
    },
    async refresh(): Promise<IdentityTokens> {
      return {
        idToken,
        refreshToken: 'refresh-alice',
        expiresInSeconds: 3600,
      };
    },
  };
  const manager = new SessionManager({ storage, identity });
  await manager.signIn('alice@example.test', 'secreto');

  const client = createHttpClient({
    baseUrl: BASE_URL,
    fetchImpl: backend.fetch,
    getAccessToken: () => manager.getAccessToken(),
    onUnauthorized: () => {
      void manager.handleUnauthorized();
    },
    timeoutMs: 5_000,
  });
  const services = createApiServices(client);

  const balance = await services.wallet.getBalance();
  assert.equal(balance.clientId, a.clientId);

  backend.revoke(idToken);
  await assert.rejects(
    () => services.movements.list(),
    (error: unknown) => error instanceof ApiError && error.kind === 'unauthorized',
  );

  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(manager.getSnapshot().status, 'anonymous');
  assert.equal(await storage.loadRefreshToken(), null);

  await assert.rejects(
    () => services.movements.list(),
    (error: unknown) => error instanceof ApiError && error.kind === 'unauthorized',
  );
  const lastCall = backend.calls[backend.calls.length - 1];
  assert.equal(headersOf(lastCall).Authorization, undefined);
});

test('journey: una respuesta tardía cancelada no se aplica', async () => {
  let backendResponded = false;
  const backendPage = {
    clientId: 'client-alice',
    count: 0,
    limit: 50,
    items: [],
  };
  const fetcher = (async (_input: RequestInfo | URL, init?: RequestInit) =>
    new Promise<Response>((resolve, reject) => {
      const timer = setTimeout(() => {
        backendResponded = true;
        resolve(jsonResponse(backendPage));
      }, 30);
      init?.signal?.addEventListener('abort', () => {
        clearTimeout(timer);
        const error = new Error('Aborted');
        error.name = 'AbortError';
        reject(error);
      });
    })) as unknown as typeof fetch;

  const client = createHttpClient({
    baseUrl: BASE_URL,
    fetchImpl: fetcher,
    getAccessToken: () => 'token-alice',
    timeoutMs: 5_000,
  });
  const services = createApiServices(client);
  const controller = new AbortController();
  const pending = services.movements.list({ signal: controller.signal });
  controller.abort();

  await assert.rejects(
    pending,
    (error: unknown) =>
      error instanceof ApiError &&
      error.kind === 'aborted' &&
      classifyOperationFailure(error) === 'cancelled',
  );
  await new Promise((resolve) => setTimeout(resolve, 60));
  assert.equal(backendResponded, false);
});

test('journey: 503 de lectura se clasifica como no disponible, nunca como éxito', async () => {
  const fetcher = (async () =>
    problemResponse(503, 'SERVICE_UNAVAILABLE')) as unknown as typeof fetch;
  const client = createHttpClient({
    baseUrl: BASE_URL,
    fetchImpl: fetcher,
    getAccessToken: () => 'token-alice',
    timeoutMs: 5_000,
  });
  const services = createApiServices(client);

  await assert.rejects(
    () => services.wallet.getBalance(),
    (error: unknown) => {
      if (!(error instanceof ApiError)) return false;
      assert.equal(error.kind, 'unavailable');
      assert.equal(classifyOperationFailure(error), 'unavailable');
      return true;
    },
  );
});

test('journey: INSUFFICIENT_FUNDS se clasifica antes de cualquier confirmación', async () => {
  const a = alice();
  const backend = new SimulatedBackend([a, bob()]);
  const services = servicesFor(backend, a.token);

  await assert.rejects(
    () =>
      services.transfers.create(
        {
          destinationTransferCode: 'BOB-001',
          amountCents: 2_000_000,
          description: 'Sin fondos',
        },
        { idempotencyKey: 'insufficient-1' },
      ),
    (error: unknown) => {
      if (!(error instanceof ApiError)) return false;
      assert.equal(classifyOperationFailure(error), 'insufficient_funds');
      return true;
    },
  );
  assert.equal(a.transfers.length, 0);
  assert.equal(a.balanceCents, 500_000);
});

test('journey: la categoría se propaga a efectivo, presupuesto y analítica sin cruzar usuarios', async () => {
  const a = alice();
  const b = bob();
  const backend = new SimulatedBackend([a, b]);
  const services = servicesFor(backend, a.token);
  const bobServices = servicesFor(backend, b.token);
  const period = new Date().toISOString().slice(0, 7);

  const created = await services.categories.create({
    name: 'Comida rápida',
    type: 'gasto',
  });
  assert.equal(created.name, 'Comida rápida');
  assert.equal(created.isSystem, false);
  assert.equal(created.active, true);

  const listed = mapCategories(await services.categories.list());
  assert.ok(listed.some((category) => category.id === created.id));
  assert.ok(listed.some((category) => category.isSystem === true));

  await services.cash.createMovement(
    { direction: 'income', amountCents: 100_000, note: 'Base' },
    { idempotencyKey: 'cash-base-1' },
  );
  const expense = await services.cash.createMovement(
    {
      direction: 'expense',
      amountCents: 25_000,
      categoryId: created.id,
      note: 'Almuerzo',
    },
    { idempotencyKey: 'cash-expense-1' },
  );
  assert.equal(expense.movement.categoryId, created.id);
  assert.equal(expense.movement.categoryName, 'Comida rápida');

  const budget = await services.budgets.create({
    categoryId: created.id,
    period,
    limitCents: 100_000,
  });
  assert.equal(budget.categoryId, created.id);
  assert.equal(budget.categoryName, 'Comida rápida');
  assert.equal(budget.spentCents, 25_000);

  const budgets = mapBudgets(await services.budgets.list({ period }));
  const mappedBudget = budgets.find((item) => item.id === budget.id);
  assert.ok(mappedBudget);
  assert.equal(mappedBudget.categoryId, created.id);
  assert.equal(mappedBudget.spentCents, 25_000);
  assert.equal(mappedBudget.percent, 25);

  const analytics = await services.analytics.categories(period);
  const food = analytics.categories.find(
    (category) => category.categoryId === created.id,
  );
  assert.ok(food);
  assert.equal(food.name, 'Comida rápida');
  assert.equal(food.amountCents, 25_000);

  const mappedAnalytics = mapAnalyticsCategories(analytics);
  const mappedCategory = mappedAnalytics.categories.find(
    (category) => category.id === created.id,
  );
  assert.ok(mappedCategory);
  assert.equal(mappedCategory.isUncategorized, false);
  assert.equal(mappedCategory.amount, 25_000);

  // Bob conserva su propio catálogo y no ve gastos, presupuestos ni
  // analítica de Alice.
  const bobCategories = mapCategories(await bobServices.categories.list());
  assert.ok(!bobCategories.some((category) => category.id === created.id));
  assert.deepEqual(await bobServices.budgets.list({ period }), []);
  const bobAnalytics = await bobServices.analytics.categories(period);
  assert.equal(bobAnalytics.categories.length, 0);
  assert.equal(bobAnalytics.uncategorizedCents, 0);
  assert.equal(bobAnalytics.totalExpenseCents, 0);
});

test('journey: categorías devuelven 409/422/403 y la UI los enruta sin inventar éxito', async () => {
  const a = alice();
  const backend = new SimulatedBackend([a, bob()]);
  const services = servicesFor(backend, a.token);

  await assert.rejects(
    () => services.categories.create({ name: 'Mercado', type: 'gasto' }),
    (error: unknown) => {
      assert.equal(classifyOperationFailure(error), 'conflict');
      assert.equal(
        routeCategoryFailure(classifyOperationFailure(error), 'create'),
        'conflict',
      );
      return true;
    },
  );

  const created = await services.categories.create({
    name: 'Comida rápida',
    type: 'gasto',
  });

  await assert.rejects(
    () => services.categories.update(created.id, { type: 'ingreso' }),
    (error: unknown) => {
      assert.equal(classifyOperationFailure(error), 'validation');
      // Un 422 de edición conserva el formulario en vez de saltar al diseño
      // de «Crear categoría».
      assert.equal(
        routeCategoryFailure(classifyOperationFailure(error), 'update'),
        'stay',
      );
      return true;
    },
  );

  await assert.rejects(
    () => services.categories.update(created.id, { name: 'Mercado' }),
    (error: unknown) => {
      assert.equal(classifyOperationFailure(error), 'conflict');
      assert.equal(
        routeCategoryFailure(classifyOperationFailure(error), 'update'),
        'stay',
      );
      return true;
    },
  );

  const system = (await services.categories.list()).find(
    (category) => category.isSystem,
  );
  assert.ok(system);
  await assert.rejects(
    () => services.categories.deactivate(system.id),
    (error: unknown) => {
      assert.equal(classifyOperationFailure(error), 'forbidden');
      assert.equal(
        routeCategoryFailure(classifyOperationFailure(error), 'delete'),
        'reload',
      );
      return true;
    },
  );

  await assert.rejects(
    () => services.categories.update('cat-inexistente', { name: 'Otra' }),
    (error: unknown) => {
      assert.equal(classifyOperationFailure(error), 'not_found');
      assert.equal(
        routeCategoryFailure(classifyOperationFailure(error), 'update'),
        'reload',
      );
      return true;
    },
  );

  await services.categories.deactivate(created.id);
  const active = await services.categories.list();
  assert.ok(!active.some((category) => category.id === created.id));
  const all = await services.categories.list({ includeInactive: true });
  assert.equal(
    all.find((category) => category.id === created.id)?.active,
    false,
  );
});

test('journey: una meta se edita sin tocar saldo ni progreso declarado', async () => {
  const a = alice();
  const b = bob();
  const backend = new SimulatedBackend([a, b]);
  const services = servicesFor(backend, a.token);
  const bobServices = servicesFor(backend, b.token);
  const movementsBefore = a.movements.length;
  const balanceBefore = a.balanceCents;

  const goal = await services.goals.create({
    name: 'Viaje',
    targetCents: 1_000_000,
    targetDate: '2027-12-31',
  });
  assert.equal(goal.savedCents, 0);
  assert.equal(goal.isAchieved, false);

  const updated = await services.goals.update(goal.id, {
    name: 'Viaje a Cartagena',
    targetDate: '2028-01-31',
  });
  assert.equal(updated.name, 'Viaje a Cartagena');
  assert.equal(updated.targetDate, '2028-01-31');
  assert.equal(updated.savedCents, 0);
  assert.equal(a.movements.length, movementsBefore);
  assert.equal(a.balanceCents, balanceBefore);

  const mapped = mapGoals(await services.goals.list());
  assert.equal(mapped[0].name, 'Viaje a Cartagena');
  assert.equal(mapped[0].savedCents, 0);

  assert.deepEqual(await bobServices.goals.list(), []);
  await assert.rejects(
    () => bobServices.goals.update(goal.id, { name: 'Robada' }),
    (error: unknown) => {
      assert.equal(classifyOperationFailure(error), 'not_found');
      return true;
    },
  );

  await assert.rejects(
    () =>
      services.goals.create({
        name: 'Viaje a Cartagena',
        targetCents: 500_000,
        targetDate: '2028-06-30',
      }),
    (error: unknown) => {
      assert.equal(classifyOperationFailure(error), 'conflict');
      return true;
    },
  );
});

test('journey: un 503 de analítica se clasifica como no disponible y no como éxito', async () => {
  const a = alice();
  const backend = new SimulatedBackend([a, bob()]);
  const services = servicesFor(backend, a.token);
  const period = new Date().toISOString().slice(0, 7);

  backend.failNextRequest('GET', '/v1/analytics/summary', 503, 'SERVICE_UNAVAILABLE');
  await assert.rejects(
    () => services.analytics.summary(period),
    (error: unknown) => {
      assert.equal(classifyOperationFailure(error), 'unavailable');
      return true;
    },
  );

  // El reintento vuelve a consultar el backend real y obtiene datos válidos.
  const summary = await services.analytics.summary(period);
  assert.equal(summary.currency, 'COP');
  assert.equal(summary.period, period);
  assert.equal(summary.incomeCents, 0);
  assert.equal(summary.expenseCents, 0);

  await assert.rejects(
    () => services.budgets.create({
      categoryId: 'cat-inexistente',
      period,
      limitCents: 50_000,
    }),
    (error: unknown) => {
      assert.equal(classifyOperationFailure(error), 'validation');
      return true;
    },
  );
});

// ============================================================
// Fase 8: escrituras de beneficiarios, presupuestos, metas y efectivo
// ============================================================
// Estos recorridos cubren la navegación de App.tsx: una respuesta 4xx no se
// presenta como éxito, el doble envío se bloquea localmente y un timeout deja
// la operación en estado incierto sin inventar confirmaciones.

test('journey: beneficiarios se crean, listan y eliminan sin saldo ni cruce de usuarios', async () => {
  const a = alice();
  const b = bob();
  const backend = new SimulatedBackend([a, b]);
  const services = servicesFor(backend, a.token);
  const bobServices = servicesFor(backend, b.token);

  const created = await services.beneficiaries.create({
    name: '  Laura   Gómez ',
    transferCode: 'bob-001',
  });
  assert.equal(created.name, 'Laura Gómez');
  assert.equal(created.transferCode, 'BOB-001');

  const list = mapBeneficiaries(await services.beneficiaries.list());
  assert.equal(list.length, 1);
  assert.equal(list[0].name, 'Laura Gómez');
  assert.equal(list[0].code, 'BOB-001');
  assert.equal(list[0].initialLetter, 'L');

  // El beneficiario no mueve saldo ni crea movimientos financieros.
  const balance = await services.wallet.getBalance();
  assert.equal(balance.availableBalanceCents, 500_000);
  assert.deepEqual(a.movements, []);

  // Bob nunca ve los beneficiarios de Alice.
  assert.deepEqual(await bobServices.beneficiaries.list(), []);

  // El contrato de beneficiarios no admite Idempotency-Key: la petición sale
  // solo con el JWT.
  const postHeaders = backend.calls
    .filter(
      (call) =>
        call.init.method === 'POST' && call.url.endsWith('/v1/beneficiaries'),
    )
    .map(headersOf)[0];
  assert.equal(postHeaders.Authorization, `Bearer ${a.token}`);
  assert.equal(postHeaders['Idempotency-Key'], undefined);

  await assert.rejects(
    () =>
      services.beneficiaries.create({
        name: 'Laura de nuevo',
        transferCode: 'BOB-001',
      }),
    (error: unknown) => {
      if (!(error instanceof ApiError)) return false;
      assert.equal(classifyOperationFailure(error), 'conflict');
      assert.equal(error.problem.code, 'BENEFICIARY_DUPLICATE');
      return error.kind === 'conflict';
    },
  );
  assert.equal(a.beneficiaries.length, 1);

  await assert.rejects(
    () =>
      services.beneficiaries.create({
        name: 'Yo mismo',
        transferCode: 'ALI-001',
      }),
    (error: unknown) => {
      if (!(error instanceof ApiError)) return false;
      assert.equal(classifyOperationFailure(error), 'validation');
      assert.equal(error.problem.code, 'BENEFICIARY_SELF');
      return true;
    },
  );

  await assert.rejects(
    () =>
      services.beneficiaries.create({
        name: 'Fantasma',
        transferCode: 'NOEXISTE-1',
      }),
    (error: unknown) => {
      if (!(error instanceof ApiError)) return false;
      assert.equal(classifyOperationFailure(error), 'not_found');
      assert.equal(error.problem.code, 'BENEFICIARY_CODE_NOT_FOUND');
      return true;
    },
  );

  const removed = await services.beneficiaries.remove(created.id);
  assert.equal(removed.id, created.id);
  assert.equal(removed.deleted, true);
  assert.deepEqual(await services.beneficiaries.list(), []);

  await assert.rejects(
    () => services.beneficiaries.getById(created.id),
    (error: unknown) => {
      assert.equal(classifyOperationFailure(error), 'not_found');
      return true;
    },
  );
});

test('journey: 401 y 403 en escrituras se clasifican como sesión y prohibido', async () => {
  const a = alice();
  const backend = new SimulatedBackend([a, bob()]);
  const services = servicesFor(backend, a.token);
  const period = new Date().toISOString().slice(0, 7);

  backend.failNextRequest('POST', '/v1/beneficiaries', 403, 'FORBIDDEN');
  await assert.rejects(
    () =>
      services.beneficiaries.create({
        name: 'Laura',
        transferCode: 'BOB-001',
      }),
    (error: unknown) => {
      assert.equal(classifyOperationFailure(error), 'forbidden');
      return true;
    },
  );
  assert.equal(a.beneficiaries.length, 0);

  backend.failNextRequest('POST', '/v1/budgets', 403, 'FORBIDDEN');
  await assert.rejects(
    () =>
      services.budgets.create({
        categoryId: 'cat-sys-gasto',
        period,
        limitCents: 100_000,
      }),
    (error: unknown) => {
      assert.equal(classifyOperationFailure(error), 'forbidden');
      return true;
    },
  );
  assert.equal(a.budgets.length, 0);

  backend.failNextRequest('POST', '/v1/goals', 403, 'FORBIDDEN');
  await assert.rejects(
    () =>
      services.goals.create({
        name: 'Viaje',
        targetCents: 1_000_000,
        targetDate: '2027-12-31',
      }),
    (error: unknown) => {
      assert.equal(classifyOperationFailure(error), 'forbidden');
      return true;
    },
  );
  assert.equal(a.goals.length, 0);

  // 401: la sesión ya no es válida y ninguna escritura se aplica.
  backend.revoke(a.token);
  await assert.rejects(
    () =>
      services.beneficiaries.create({
        name: 'Laura',
        transferCode: 'BOB-001',
      }),
    (error: unknown) => {
      assert.equal(classifyOperationFailure(error), 'session');
      return true;
    },
  );
  await assert.rejects(
    () =>
      services.goals.create({
        name: 'Viaje',
        targetCents: 1_000_000,
        targetDate: '2027-12-31',
      }),
    (error: unknown) => {
      assert.equal(classifyOperationFailure(error), 'session');
      return true;
    },
  );
  await assert.rejects(
    () => services.cash.createMovement(
      { direction: 'income', amountCents: 10_000, note: 'Base' },
      { idempotencyKey: 'cash-session-1' },
    ),
    (error: unknown) => {
      assert.equal(classifyOperationFailure(error), 'session');
      return true;
    },
  );
  assert.equal(a.beneficiaries.length, 0);
  assert.equal(a.goals.length, 0);
  assert.equal(a.cashEntries.length, 0);
});

test('journey: 409 y 422 de presupuestos, metas y efectivo no crean registros', async () => {
  const a = alice();
  const backend = new SimulatedBackend([a, bob()]);
  const services = servicesFor(backend, a.token);
  const period = new Date().toISOString().slice(0, 7);

  // Presupuesto: primero válido, luego duplicado y categoría inexistente.
  const budget = await services.budgets.create({
    categoryId: 'cat-sys-gasto',
    period,
    limitCents: 100_000,
  });
  assert.equal(a.budgets.length, 1);

  await assert.rejects(
    () =>
      services.budgets.create({
        categoryId: 'cat-sys-gasto',
        period,
        limitCents: 200_000,
      }),
    (error: unknown) => {
      if (!(error instanceof ApiError)) return false;
      assert.equal(classifyOperationFailure(error), 'conflict');
      assert.equal(error.problem.code, 'BUDGET_DUPLICATE');
      return true;
    },
  );

  await assert.rejects(
    () =>
      services.budgets.create({
        categoryId: 'cat-inexistente',
        period,
        limitCents: 100_000,
      }),
    (error: unknown) => {
      if (!(error instanceof ApiError)) return false;
      assert.equal(classifyOperationFailure(error), 'validation');
      assert.equal(error.problem.code, 'INVALID_CATEGORY');
      return true;
    },
  );

  backend.failNextRequest('PATCH', '/v1/budgets', 422, 'VALIDATION_ERROR');
  await assert.rejects(
    () => services.budgets.update(budget.id, { limitCents: 150_000 }),
    (error: unknown) => {
      assert.equal(classifyOperationFailure(error), 'validation');
      return true;
    },
  );
  assert.equal(a.budgets.length, 1);
  assert.equal(a.budgets[0].limitCents, 100_000);

  // Meta: fecha inválida, duplicado y edición inexistente.
  await assert.rejects(
    () =>
      services.goals.create({
        name: 'Viaje',
        targetCents: 1_000_000,
        targetDate: '2020-01-01',
      }),
    (error: unknown) => {
      if (!(error instanceof ApiError)) return false;
      assert.equal(classifyOperationFailure(error), 'validation');
      assert.equal(error.problem.code, 'INVALID_TARGET_DATE');
      return true;
    },
  );

  const goal = await services.goals.create({
    name: 'Viaje',
    targetCents: 1_000_000,
    targetDate: '2027-12-31',
  });
  assert.equal(a.goals.length, 1);

  await assert.rejects(
    () =>
      services.goals.create({
        name: 'Viaje',
        targetCents: 500_000,
        targetDate: '2027-12-31',
      }),
    (error: unknown) => {
      if (!(error instanceof ApiError)) return false;
      assert.equal(classifyOperationFailure(error), 'conflict');
      assert.equal(error.problem.code, 'GOAL_DUPLICATE');
      return true;
    },
  );

  await assert.rejects(
    () => services.goals.update('goal-inexistente', { name: 'Otra' }),
    (error: unknown) => {
      assert.equal(classifyOperationFailure(error), 'not_found');
      return true;
    },
  );

  // Efectivo: sin fondos y categoría inexistente.
  await assert.rejects(
    () =>
      services.cash.createMovement(
        { direction: 'expense', amountCents: 50_000, note: 'Café' },
        { idempotencyKey: 'cash-no-funds-1' },
      ),
    (error: unknown) => {
      if (!(error instanceof ApiError)) return false;
      assert.equal(classifyOperationFailure(error), 'validation');
      assert.equal(error.problem.code, 'CASH_INSUFFICIENT');
      return true;
    },
  );

  await assert.rejects(
    () =>
      services.cash.createMovement(
        {
          direction: 'income',
          amountCents: 10_000,
          categoryId: 'cat-inexistente',
        },
        { idempotencyKey: 'cash-bad-category-1' },
      ),
    (error: unknown) => {
      if (!(error instanceof ApiError)) return false;
      assert.equal(classifyOperationFailure(error), 'not_found');
      assert.equal(error.problem.code, 'CATEGORY_NOT_FOUND');
      return true;
    },
  );

  assert.equal(a.cashEntries.length, 0);
  assert.equal(a.cashAvailableCents, 0);
  assert.equal(goal.savedCents, 0);
});

test('journey: doble envío bloqueado y timeout incierto sin confirmación', async () => {
  const a = alice();
  const backend = new SimulatedBackend([a, bob()]);
  const services = servicesFor(backend, a.token);
  const operation = new FinancialOperation({
    scope: 'journey.goals.create',
    keyStore: new IdempotencyKeyStore(),
  });
  const input = {
    name: 'Viaje',
    targetCents: 1_000_000,
    targetDate: '2027-12-31',
  };

  // El primer envío queda en vuelo; el segundo debe bloquearse sin llegar al
  // backend. Las metas no usan Idempotency-Key: el bloqueo es local.
  let release: () => void = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const first = operation.run(`goals.create|${input.name}`, async () => {
    const created = await services.goals.create(input);
    await gate;
    return created;
  });
  const second = await operation.run(`goals.create|${input.name}`, () =>
    services.goals.create(input),
  );
  assert.equal(second.status, 'blocked');

  release();
  const confirmed = await first;
  assert.equal(confirmed.status, 'confirmed');
  assert.equal(a.goals.length, 1);

  const posts = backend.calls.filter(
    (call) => call.init.method === 'POST' && call.url.endsWith('/v1/goals'),
  );
  assert.equal(posts.length, 1);
  assert.equal(headersOf(posts[0])['Idempotency-Key'], undefined);

  // Timeout: la operación queda incierta, nunca confirmada.
  const timeoutClient = createHttpClient({
    baseUrl: BASE_URL,
    fetchImpl: (async (_input: RequestInfo | URL, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          const error = new Error('Aborted');
          error.name = 'AbortError';
          reject(error);
        });
      })) as unknown as typeof fetch,
    getAccessToken: () => a.token,
    timeoutMs: 20,
  });
  const timeoutServices = createApiServices(timeoutClient);
  const timeoutOperation = new FinancialOperation({
    scope: 'journey.goals.create.timeout',
    keyStore: new IdempotencyKeyStore(),
  });
  const outcome = await timeoutOperation.run(
    `goals.create|${input.name}`,
    () => timeoutServices.goals.create(input),
  );
  assert.equal(outcome.status, 'uncertain');
  assert.equal(classifyOperationFailure(outcome.error), 'uncertain');
  assert.equal(isAmbiguousFailure(classifyOperationFailure(outcome.error)), true);
});

test('journey: una escritura cancelada no aplica una respuesta tardía', async () => {
  const a = alice();
  const backend = new SimulatedBackend([a, bob()]);
  // El fetch real del backend se retrasa: se cancela antes de que responda.
  const slowFetch = (async (input: RequestInfo | URL, init?: RequestInit) =>
    new Promise<Response>((resolve, reject) => {
      const timer = setTimeout(() => {
        void backend.fetch(input, init).then(resolve, reject);
      }, 40);
      init?.signal?.addEventListener('abort', () => {
        clearTimeout(timer);
        const error = new Error('Aborted');
        error.name = 'AbortError';
        reject(error);
      });
    })) as unknown as typeof fetch;

  const client = createHttpClient({
    baseUrl: BASE_URL,
    fetchImpl: slowFetch,
    getAccessToken: () => a.token,
    timeoutMs: 5_000,
  });
  const services = createApiServices(client);
  const controller = new AbortController();
  const operation = new FinancialOperation({
    scope: 'journey.goals.create.abort',
    keyStore: new IdempotencyKeyStore(),
  });

  const pending = operation.run('goals.create|Viaje', () =>
    services.goals.create(
      {
        name: 'Viaje',
        targetCents: 1_000_000,
        targetDate: '2027-12-31',
      },
      { signal: controller.signal },
    ),
  );
  controller.abort();
  const outcome = await pending;
  assert.equal(outcome.status, 'cancelled');
  assert.equal(classifyOperationFailure(outcome.error), 'cancelled');

  await new Promise((resolve) => setTimeout(resolve, 80));
  // El backend simulado nunca recibió la escritura: no hay meta creada.
  assert.equal(a.goals.length, 0);
  assert.equal(
    backend.calls.filter(
      (call) => call.init.method === 'POST' && call.url.endsWith('/v1/goals'),
    ).length,
    0,
  );
});
