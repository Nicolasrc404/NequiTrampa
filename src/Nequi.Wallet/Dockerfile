FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS base
WORKDIR /app
EXPOSE 8080

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY ["src/Nequi.Wallet/Nequi.Wallet.csproj", "Nequi.Wallet/"]
COPY ["src/Nequi.Shared/Nequi.Shared.csproj", "Nequi.Shared/"]
RUN dotnet restore "Nequi.Wallet/Nequi.Wallet.csproj"
COPY src/Nequi.Wallet/ Nequi.Wallet/
COPY src/Nequi.Shared/ Nequi.Shared/
WORKDIR "/src/Nequi.Wallet"
RUN dotnet build "Nequi.Wallet.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "Nequi.Wallet.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
# Cloud Run espera el puerto 8080
ENV ASPNETCORE_URLS=http://+:8080
ENTRYPOINT ["dotnet", "Nequi.Wallet.dll"]
