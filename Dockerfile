# Build any service: docker build --build-arg SERVICE=Nequi.Workers -t workers .
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
ARG SERVICE
WORKDIR /src
COPY src/Nequi.Shared/*.csproj src/Nequi.Shared/
COPY src/${SERVICE}/*.csproj src/${SERVICE}/
RUN dotnet restore src/${SERVICE}/${SERVICE}.csproj
COPY src/ src/
RUN dotnet publish src/${SERVICE}/${SERVICE}.csproj -c Release -o /app --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:10.0
ARG SERVICE
ENV SERVICE_DLL=${SERVICE}.dll ASPNETCORE_HTTP_PORTS=8080 DOTNET_gcServer=0
WORKDIR /app
COPY --from=build /app .
USER $APP_UID
ENTRYPOINT ["sh", "-c", "dotnet $SERVICE_DLL"]
