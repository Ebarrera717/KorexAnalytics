USE [ZeusAgencias_23]
GO
/****** Object:  StoredProcedure [dbo].[Zeus®spze_InformeReembolsos] ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

IF OBJECT_ID('[dbo].[Zeus®spze_InformeReembolsos]', 'P') IS NOT NULL
    DROP PROCEDURE [dbo].[Zeus®spze_InformeReembolsos]
GO

CREATE PROCEDURE [dbo].[Zeus®spze_InformeReembolsos]
    @fecha_inicio          SMALLDATETIME   = NULL,
    @fecha_fin             SMALLDATETIME   = NULL,
    @cd_cliente            VARCHAR(8000)   = NULL,
    @cd_sucursal           VARCHAR(1000)   = NULL,
    @cd_implante           VARCHAR(1000)   = NULL,
    @cd_tiquete            VARCHAR(100)    = NULL,
    @cd_vendedor           VARCHAR(8000)   = NULL,
    @cd_tiqueteador        VARCHAR(8000)   = NULL,
    @cd_aerolinea          VARCHAR(1000)   = NULL,
    @cd_PNR                VARCHAR(50)     = NULL,
    @ds_pax                VARCHAR(250)    = NULL,
    @cd_centrocosto        VARCHAR(1000)   = NULL,
    @Nacionalidad          VARCHAR(25)     = NULL,
    @NacionalidadReal      VARCHAR(25)     = NULL,
    @MostrarAnulacion      VARCHAR(2)      = NULL,
    -- Parámetros legados para compatibilidad hacia atrás
    @clientes              VARCHAR(MAX)    = NULL,
    @sucursales            VARCHAR(MAX)    = NULL,
    @implantes             VARCHAR(MAX)    = NULL,
    @Tiquete               VARCHAR(MAX)    = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET TRANSACTION ISOLATION LEVEL READ UNCOMMITTED;

    -- Normalización de Parámetros heredados
    IF @cd_cliente IS NULL AND @clientes IS NOT NULL SET @cd_cliente = @clientes;
    IF @cd_sucursal IS NULL AND @sucursales IS NOT NULL SET @cd_sucursal = @sucursales;
    IF @cd_implante IS NULL AND @implantes IS NOT NULL SET @cd_implante = @implantes;
    IF @cd_tiquete IS NULL AND @Tiquete IS NOT NULL SET @cd_tiquete = @Tiquete;

    -- Normalización de Fechas (Rango de día completo para fecha_fin)
    DECLARE @f_inicio DATETIME = CASE WHEN @fecha_inicio IS NOT NULL THEN CAST(CAST(@fecha_inicio AS DATE) AS DATETIME) ELSE NULL END;
    DECLARE @f_fin    DATETIME = CASE WHEN @fecha_fin IS NOT NULL THEN DATEADD(second, 86399, CAST(CAST(@fecha_fin AS DATE) AS DATETIME)) ELSE NULL END;

    -- Nombre de la Compañía
    DECLARE @Compania VARCHAR(500);
    SELECT @Compania = valor FROM dbo.Parametros WITH(NOLOCK) WHERE Id = 1;

    -- Tablas Temporales indexadas para cálculo dinámico y filtro de Nacionalidad Real
    IF OBJECT_ID('tempdb..#TempCiudadesExterior') IS NOT NULL DROP TABLE #TempCiudadesExterior;
    IF OBJECT_ID('tempdb..#TempCiudadesColombia') IS NOT NULL DROP TABLE #TempCiudadesColombia;

    CREATE TABLE #TempCiudadesExterior (cd_Iata VARCHAR(10) PRIMARY KEY);
    INSERT INTO #TempCiudadesExterior (cd_Iata)
    SELECT DISTINCT UPPER(LTRIM(RTRIM(c.cd_Iata)))
    FROM dbo.Ciudades c WITH(NOLOCK)
    INNER JOIN dbo.Paises p WITH(NOLOCK) ON p.id = c.id_paises
    WHERE c.cd_Iata IS NOT NULL AND LTRIM(RTRIM(c.cd_Iata)) <> '' AND p.cd_codigo <> 'CO';

    CREATE TABLE #TempCiudadesColombia (cd_Iata VARCHAR(10) PRIMARY KEY);
    INSERT INTO #TempCiudadesColombia (cd_Iata)
    SELECT DISTINCT UPPER(LTRIM(RTRIM(c.cd_Iata)))
    FROM dbo.Ciudades c WITH(NOLOCK)
    INNER JOIN dbo.Paises p WITH(NOLOCK) ON p.id = c.id_paises
    WHERE c.cd_Iata IS NOT NULL AND LTRIM(RTRIM(c.cd_Iata)) <> '' AND p.cd_codigo = 'CO';

    -- Tablas temporales de filtros multi-valor
    CREATE TABLE #FiltroClientes (codigo VARCHAR(100) PRIMARY KEY);
    IF ISNULL(LTRIM(RTRIM(@cd_cliente)), '') <> '' AND UPPER(@cd_cliente) <> 'TODOS'
        INSERT INTO #FiltroClientes (codigo)
        SELECT DISTINCT LTRIM(RTRIM(codigo)) FROM dbo.fnSplit(@cd_cliente, ',', 0, 1) WHERE LTRIM(RTRIM(codigo)) <> '';

    CREATE TABLE #FiltroSucursales (codigo VARCHAR(100) PRIMARY KEY);
    IF ISNULL(LTRIM(RTRIM(@cd_sucursal)), '') <> '' AND UPPER(@cd_sucursal) <> 'TODOS'
        INSERT INTO #FiltroSucursales (codigo)
        SELECT DISTINCT LTRIM(RTRIM(codigo)) FROM dbo.fnSplit(@cd_sucursal, ',', 0, 1) WHERE LTRIM(RTRIM(codigo)) <> '';

    CREATE TABLE #FiltroImplantes (codigo VARCHAR(100) PRIMARY KEY);
    IF ISNULL(LTRIM(RTRIM(@cd_implante)), '') <> '' AND UPPER(@cd_implante) <> 'TODOS'
        INSERT INTO #FiltroImplantes (codigo)
        SELECT DISTINCT LTRIM(RTRIM(codigo)) FROM dbo.fnSplit(@cd_implante, ',', 0, 1) WHERE LTRIM(RTRIM(codigo)) <> '';

    CREATE TABLE #FiltroVendedores (codigo VARCHAR(100) PRIMARY KEY);
    IF ISNULL(LTRIM(RTRIM(@cd_vendedor)), '') <> '' AND UPPER(@cd_vendedor) <> 'TODOS'
        INSERT INTO #FiltroVendedores (codigo)
        SELECT DISTINCT LTRIM(RTRIM(codigo)) FROM dbo.fnSplit(@cd_vendedor, ',', 0, 1) WHERE LTRIM(RTRIM(codigo)) <> '';

    CREATE TABLE #FiltroTiqueteadores (codigo VARCHAR(100) PRIMARY KEY);
    IF ISNULL(LTRIM(RTRIM(@cd_tiqueteador)), '') <> '' AND UPPER(@cd_tiqueteador) <> 'TODOS'
        INSERT INTO #FiltroTiqueteadores (codigo)
        SELECT DISTINCT LTRIM(RTRIM(codigo)) FROM dbo.fnSplit(@cd_tiqueteador, ',', 0, 1) WHERE LTRIM(RTRIM(codigo)) <> '';

    CREATE TABLE #FiltroAerolineas (codigo VARCHAR(100) PRIMARY KEY);
    IF ISNULL(LTRIM(RTRIM(@cd_aerolinea)), '') <> '' AND UPPER(@cd_aerolinea) <> 'TODOS'
        INSERT INTO #FiltroAerolineas (codigo)
        SELECT DISTINCT LTRIM(RTRIM(codigo)) FROM dbo.fnSplit(@cd_aerolinea, ',', 0, 1) WHERE LTRIM(RTRIM(codigo)) <> '';

    CREATE TABLE #FiltroCentrosCosto (codigo VARCHAR(100) PRIMARY KEY);
    IF ISNULL(LTRIM(RTRIM(@cd_centrocosto)), '') <> '' AND UPPER(@cd_centrocosto) <> 'TODOS'
        INSERT INTO #FiltroCentrosCosto (codigo)
        SELECT DISTINCT LTRIM(RTRIM(codigo)) FROM dbo.fnSplit(@cd_centrocosto, ',', 0, 1) WHERE LTRIM(RTRIM(codigo)) <> '';

    SELECT 
        @Compania AS [Compania],
        RTRIM(LTRIM(r.cd_cliente_codigo)) AS [Cliente],
        COALESCE(NULLIF(c.RAZONCIAL, ''), NULLIF(r.ds_cliente_nombre, ''), '') AS [Cliente_Nm],
        RTRIM(LTRIM(ISNULL(t.ds_paxape, '') + ' ' + ISNULL(t.ds_paxname, ''))) AS [Pasajero],
        RTRIM(LTRIM(r.cd_fuente)) + RTRIM(LTRIM(ISNULL(r.cd_serie, ''))) + RTRIM(LTRIM(ISNULL(r.cd_consecutivo, ''))) AS [Codigo],
        CONVERT(VARCHAR(10), r.dt_fechacont, 120) AS [Fecha],
        RTRIM(LTRIM(t.ds_records)) AS [Reserva],
        COALESCE(NULLIF(e.cd_siglas, ''), e.cd_codigo, '') AS [Cod_Aerolinea],
        ISNULL(e.ds_Alias, ISNULL(p_aero.RAZONCIAL, e.cd_codigo)) AS [Aerolinea],
        RTRIM(LTRIM(t.cd_tiquete)) AS [Tiquete],
        ISNULL(vr.Tkt_Itinerario, t.ds_itinerario) AS [Ruta],
        ISNULL(vr.Tarifa_Valor, 0) AS [Tarifa],
        ISNULL(vr.IVA_Tarifa, 0) AS [IVA],
        ISNULL(vr.Otros_Valor, 0) AS [Otros],
        ISNULL(r.am_penalidad, 0) AS [Penalidad],
        ISNULL(r.am_valor, 0) AS [TotalReembolso],
        CASE WHEN f.numero IS NOT NULL THEN RTRIM(LTRIM(f.cd_fuente)) + '-' + RTRIM(LTRIM(f.numero)) ELSE '' END AS [Factura],
        ISNULL(ztc.autorizacionaerea, '') AS [Autorizacion],
        ISNULL(ztc.voucheraerolinea, '') AS [Voucher],
        ISNULL(f.cd_vendedor, '') AS [Cod_Vendedor],
        ISNULL(v.NOMBVENDE, '') AS [Vendedor],
        ISNULL(v.Identificacion, '') AS [Identificacion del Vendedor],
        ISNULL(tq.cd_codigo, '') AS [Cod_Tiqueteador],
        ISNULL(tq.ds_nombre, '') AS [Tiqueteador],
        ISNULL(s.cd_codigo, '') AS [Sucursal],
        ISNULL(i.cd_codigo, '') AS [Implante],
        ISNULL(r.cd_cencosto, '') AS [CentroCosto],
        ISNULL(r.ds_concepto, '') AS [Concepto],
        CASE WHEN ISNULL(vr.Tkt_Nacionalidad, t.in_nacionalidad) = 1 THEN 'Nacional' ELSE 'Internacional' END AS [Nacionalidad],
        [Nacionalidad Real] = CASE 
            WHEN (ISNULL(vr.Tkt_Itinerario, t.ds_itinerario)) IS NOT NULL 
                 AND CHARINDEX('/', REPLACE(ISNULL(vr.Tkt_Itinerario, t.ds_itinerario), '-', '/')) > 0 
                 AND EXISTS (
                    SELECT 1 
                    FROM dbo.fnSplit(REPLACE(REPLACE(UPPER(LTRIM(RTRIM(ISNULL(vr.Tkt_Itinerario, t.ds_itinerario)))), ' ', ''), '-', '/'), '/', 0, 1) split
                    JOIN #TempCiudadesExterior ext ON ext.cd_Iata = split.codigo
                    WHERE LTRIM(RTRIM(split.codigo)) <> ''
                 ) THEN 'Internacional'
            WHEN (ISNULL(vr.Tkt_Itinerario, t.ds_itinerario)) IS NOT NULL 
                 AND CHARINDEX('/', REPLACE(ISNULL(vr.Tkt_Itinerario, t.ds_itinerario), '-', '/')) > 0 
                 AND EXISTS (
                    SELECT 1 
                    FROM dbo.fnSplit(REPLACE(REPLACE(UPPER(LTRIM(RTRIM(ISNULL(vr.Tkt_Itinerario, t.ds_itinerario)))), ' ', ''), '-', '/'), '/', 0, 1) split
                    WHERE LTRIM(RTRIM(split.codigo)) <> ''
                 )
                 AND NOT EXISTS (
                    SELECT 1 
                    FROM dbo.fnSplit(REPLACE(REPLACE(UPPER(LTRIM(RTRIM(ISNULL(vr.Tkt_Itinerario, t.ds_itinerario)))), ' ', ''), '-', '/'), '/', 0, 1) split
                    WHERE LTRIM(RTRIM(split.codigo)) <> '' 
                      AND split.codigo NOT IN (SELECT cd_Iata FROM #TempCiudadesColombia)
                 ) THEN 'Nacional'
            WHEN ISNULL(vr.Tkt_Nacionalidad, t.in_nacionalidad) = 1 THEN 'Nacional'
            ELSE 'Internacional'
        END,
        CASE WHEN r.id_usuario_anul IS NOT NULL THEN 'SI' ELSE 'NO' END AS [Anulado],
        r.dt_fechacont
    FROM dbo.vCierreTiquetesReembolsados vr WITH(NOLOCK)
    INNER JOIN dbo.Reembolsos r WITH(NOLOCK) ON r.id = vr.Id_Reembolso
    LEFT JOIN dbo.Sucursales s WITH(NOLOCK) ON s.id = r.id_sucursal
    LEFT JOIN dbo.implantes i WITH(NOLOCK) ON i.id = r.id_implante
    INNER JOIN dbo.Tiquetes t WITH(NOLOCK) ON t.cd_tiquete = r.cd_tiquete 
    LEFT JOIN dbo.fac_factura f WITH(NOLOCK) ON f.id = t.id_fac_factura
    LEFT JOIN dbo.Entidades e WITH(NOLOCK) ON e.id = t.id_entvend
    LEFT JOIN dbo.PROVEEDORES p_aero WITH(NOLOCK) ON p_aero.IDPROVE = e.cd_proveedor
    LEFT JOIN dbo.CLIENTES c WITH(NOLOCK) ON (c.IDCLIENTE = r.cd_cliente_codigo)
    LEFT JOIN dbo.MAEVENDE v WITH(NOLOCK) ON (v.IDVENDE = f.cd_vendedor)
    LEFT JOIN dbo.Tiqueteadores tq WITH(NOLOCK) ON (tq.id = t.id_tiqueteadores)
    OUTER APPLY dbo.fnza_ZeusTc_Autorizaciones(t.ds_records) ztc
    WHERE 1 = 1
      -- Filtro Fechas
      AND (@f_inicio IS NULL OR r.dt_fechacont >= @f_inicio)
      AND (@f_fin IS NULL OR r.dt_fechacont <= @f_fin)
      -- Filtro Clientes multi-valor
      AND (NOT EXISTS (SELECT 1 FROM #FiltroClientes) OR r.cd_cliente_codigo IN (SELECT codigo FROM #FiltroClientes))
      -- Filtro Sucursales multi-valor
      AND (NOT EXISTS (SELECT 1 FROM #FiltroSucursales) OR s.cd_codigo IN (SELECT codigo FROM #FiltroSucursales))
      -- Filtro Implantes multi-valor
      AND (NOT EXISTS (SELECT 1 FROM #FiltroImplantes) OR i.cd_codigo IN (SELECT codigo FROM #FiltroImplantes))
      -- Filtro Tiquete
      AND (@cd_tiquete IS NULL OR LTRIM(RTRIM(@cd_tiquete)) = '' OR r.cd_tiquete LIKE '%' + LTRIM(RTRIM(@cd_tiquete)) + '%' OR t.cd_tiquete LIKE '%' + LTRIM(RTRIM(@cd_tiquete)) + '%')
      -- Filtro Vendedores multi-valor
      AND (NOT EXISTS (SELECT 1 FROM #FiltroVendedores) OR f.cd_vendedor IN (SELECT codigo FROM #FiltroVendedores))
      -- Filtro Tiqueteadores multi-valor
      AND (NOT EXISTS (SELECT 1 FROM #FiltroTiqueteadores) OR tq.cd_codigo IN (SELECT codigo FROM #FiltroTiqueteadores))
      -- Filtro Aerolíneas multi-valor
      AND (NOT EXISTS (SELECT 1 FROM #FiltroAerolineas) OR e.cd_codigo IN (SELECT codigo FROM #FiltroAerolineas) OR e.cd_siglas IN (SELECT codigo FROM #FiltroAerolineas))
      -- Filtro PNR
      AND (@cd_PNR IS NULL OR LTRIM(RTRIM(@cd_PNR)) = '' OR t.ds_records LIKE '%' + LTRIM(RTRIM(@cd_PNR)) + '%')
      -- Filtro Pasajero
      AND (@ds_pax IS NULL OR LTRIM(RTRIM(@ds_pax)) = '' OR (t.ds_paxape + ' ' + t.ds_paxname LIKE '%' + LTRIM(RTRIM(@ds_pax)) + '%') OR (t.ds_paxname + ' ' + t.ds_paxape LIKE '%' + LTRIM(RTRIM(@ds_pax)) + '%'))
      -- Filtro Centros de Costo multi-valor
      AND (NOT EXISTS (SELECT 1 FROM #FiltroCentrosCosto) OR r.cd_cencosto IN (SELECT codigo FROM #FiltroCentrosCosto))
      -- Filtro Anulaciones
      AND (
          @MostrarAnulacion IS NULL OR UPPER(LTRIM(RTRIM(@MostrarAnulacion))) IN ('', 'TODOS')
          OR (UPPER(LTRIM(RTRIM(@MostrarAnulacion))) = 'SI' AND r.id_usuario_anul IS NOT NULL)
          OR (UPPER(LTRIM(RTRIM(@MostrarAnulacion))) = 'NO' AND r.id_usuario_anul IS NULL)
      )
      -- Filtro Nacionalidad Original
      AND (
          @Nacionalidad IS NULL OR UPPER(LTRIM(RTRIM(@Nacionalidad))) IN ('', 'TODOS')
          OR (UPPER(LTRIM(RTRIM(@Nacionalidad))) IN ('NACIONAL', '1') AND ISNULL(vr.Tkt_Nacionalidad, t.in_nacionalidad) = 1)
          OR (UPPER(LTRIM(RTRIM(@Nacionalidad))) IN ('INTERNACIONAL', '2') AND ISNULL(vr.Tkt_Nacionalidad, t.in_nacionalidad) <> 1)
      )
      -- Filtro Nacionalidad Real
      AND (
          @NacionalidadReal IS NULL OR UPPER(LTRIM(RTRIM(@NacionalidadReal))) IN ('', 'TODOS')
          OR (
              UPPER(LTRIM(RTRIM(@NacionalidadReal))) = 'INTERNACIONAL'
              AND (
                  (
                      (ISNULL(vr.Tkt_Itinerario, t.ds_itinerario)) IS NOT NULL
                      AND CHARINDEX('/', REPLACE(ISNULL(vr.Tkt_Itinerario, t.ds_itinerario), '-', '/')) > 0
                      AND EXISTS (
                          SELECT 1
                          FROM dbo.fnSplit(REPLACE(REPLACE(UPPER(LTRIM(RTRIM(ISNULL(vr.Tkt_Itinerario, t.ds_itinerario)))), ' ', ''), '-', '/'), '/', 0, 1) split
                          JOIN #TempCiudadesExterior ext ON ext.cd_Iata = split.codigo
                          WHERE LTRIM(RTRIM(split.codigo)) <> ''
                      )
                  )
                  OR (
                      (
                          (ISNULL(vr.Tkt_Itinerario, t.ds_itinerario)) IS NULL
                          OR CHARINDEX('/', REPLACE(ISNULL(vr.Tkt_Itinerario, t.ds_itinerario), '-', '/')) = 0
                      )
                      AND ISNULL(vr.Tkt_Nacionalidad, t.in_nacionalidad) <> 1
                  )
              )
          )
          OR (
              UPPER(LTRIM(RTRIM(@NacionalidadReal))) = 'NACIONAL'
              AND (
                  (
                      (ISNULL(vr.Tkt_Itinerario, t.ds_itinerario)) IS NOT NULL
                      AND CHARINDEX('/', REPLACE(ISNULL(vr.Tkt_Itinerario, t.ds_itinerario), '-', '/')) > 0
                      AND NOT EXISTS (
                          SELECT 1
                          FROM dbo.fnSplit(REPLACE(REPLACE(UPPER(LTRIM(RTRIM(ISNULL(vr.Tkt_Itinerario, t.ds_itinerario)))), ' ', ''), '-', '/'), '/', 0, 1) split
                          JOIN #TempCiudadesExterior ext ON ext.cd_Iata = split.codigo
                          WHERE LTRIM(RTRIM(split.codigo)) <> ''
                      )
                  )
                  OR (
                      (
                          (ISNULL(vr.Tkt_Itinerario, t.ds_itinerario)) IS NULL
                          OR CHARINDEX('/', REPLACE(ISNULL(vr.Tkt_Itinerario, t.ds_itinerario), '-', '/')) = 0
                      )
                      AND ISNULL(vr.Tkt_Nacionalidad, t.in_nacionalidad) = 1
                  )
              )
          )
      )
    ORDER BY r.dt_fechacont DESC, r.id DESC;

    -- Limpieza de tablas temporales
    IF OBJECT_ID('tempdb..#TempCiudadesExterior') IS NOT NULL DROP TABLE #TempCiudadesExterior;
    IF OBJECT_ID('tempdb..#TempCiudadesColombia') IS NOT NULL DROP TABLE #TempCiudadesColombia;
    IF OBJECT_ID('tempdb..#FiltroClientes') IS NOT NULL DROP TABLE #FiltroClientes;
    IF OBJECT_ID('tempdb..#FiltroSucursales') IS NOT NULL DROP TABLE #FiltroSucursales;
    IF OBJECT_ID('tempdb..#FiltroImplantes') IS NOT NULL DROP TABLE #FiltroImplantes;
    IF OBJECT_ID('tempdb..#FiltroVendedores') IS NOT NULL DROP TABLE #FiltroVendedores;
    IF OBJECT_ID('tempdb..#FiltroTiqueteadores') IS NOT NULL DROP TABLE #FiltroTiqueteadores;
    IF OBJECT_ID('tempdb..#FiltroAerolineas') IS NOT NULL DROP TABLE #FiltroAerolineas;
    IF OBJECT_ID('tempdb..#FiltroCentrosCosto') IS NOT NULL DROP TABLE #FiltroCentrosCosto;
END
GO

-- 2. Procedimiento Homólogo / Alias sin caracteres especiales
IF OBJECT_ID('[dbo].[spze_InformeReembolsos]', 'P') IS NOT NULL
    DROP PROCEDURE [dbo].[spze_InformeReembolsos]
GO

CREATE PROCEDURE [dbo].[spze_InformeReembolsos]
    @fecha_inicio          SMALLDATETIME   = NULL,
    @fecha_fin             SMALLDATETIME   = NULL,
    @cd_cliente            VARCHAR(8000)   = NULL,
    @cd_sucursal           VARCHAR(1000)   = NULL,
    @cd_implante           VARCHAR(1000)   = NULL,
    @cd_tiquete            VARCHAR(100)    = NULL,
    @cd_vendedor           VARCHAR(8000)   = NULL,
    @cd_tiqueteador        VARCHAR(8000)   = NULL,
    @cd_aerolinea          VARCHAR(1000)   = NULL,
    @cd_PNR                VARCHAR(50)     = NULL,
    @ds_pax                VARCHAR(250)    = NULL,
    @cd_centrocosto        VARCHAR(1000)   = NULL,
    @Nacionalidad          VARCHAR(25)     = NULL,
    @NacionalidadReal      VARCHAR(25)     = NULL,
    @MostrarAnulacion      VARCHAR(2)      = NULL,
    @clientes              VARCHAR(MAX)    = NULL,
    @sucursales            VARCHAR(MAX)    = NULL,
    @implantes             VARCHAR(MAX)    = NULL,
    @Tiquete               VARCHAR(MAX)    = NULL
AS
BEGIN
    EXEC [dbo].[Zeus®spze_InformeReembolsos]
        @fecha_inicio     = @fecha_inicio,
        @fecha_fin        = @fecha_fin,
        @cd_cliente       = @cd_cliente,
        @cd_sucursal      = @cd_sucursal,
        @cd_implante      = @cd_implante,
        @cd_tiquete       = @cd_tiquete,
        @cd_vendedor      = @cd_vendedor,
        @cd_tiqueteador   = @cd_tiqueteador,
        @cd_aerolinea     = @cd_aerolinea,
        @cd_PNR           = @cd_PNR,
        @ds_pax           = @ds_pax,
        @cd_centrocosto   = @cd_centrocosto,
        @Nacionalidad     = @Nacionalidad,
        @NacionalidadReal = @NacionalidadReal,
        @MostrarAnulacion = @MostrarAnulacion,
        @clientes         = @clientes,
        @sucursales       = @sucursales,
        @implantes        = @implantes,
        @Tiquete          = @Tiquete;
END
GO

-- 3. Procedimiento Homólogo / Alias simple
IF OBJECT_ID('[dbo].[InformeReembolsos]', 'P') IS NOT NULL
    DROP PROCEDURE [dbo].[InformeReembolsos]
GO

CREATE PROCEDURE [dbo].[InformeReembolsos]
    @fecha_inicio          SMALLDATETIME   = NULL,
    @fecha_fin             SMALLDATETIME   = NULL,
    @cd_cliente            VARCHAR(8000)   = NULL,
    @cd_sucursal           VARCHAR(1000)   = NULL,
    @cd_implante           VARCHAR(1000)   = NULL,
    @cd_tiquete            VARCHAR(100)    = NULL,
    @cd_vendedor           VARCHAR(8000)   = NULL,
    @cd_tiqueteador        VARCHAR(8000)   = NULL,
    @cd_aerolinea          VARCHAR(1000)   = NULL,
    @cd_PNR                VARCHAR(50)     = NULL,
    @ds_pax                VARCHAR(250)    = NULL,
    @cd_centrocosto        VARCHAR(1000)   = NULL,
    @Nacionalidad          VARCHAR(25)     = NULL,
    @NacionalidadReal      VARCHAR(25)     = NULL,
    @MostrarAnulacion      VARCHAR(2)      = NULL,
    @clientes              VARCHAR(MAX)    = NULL,
    @sucursales            VARCHAR(MAX)    = NULL,
    @implantes             VARCHAR(MAX)    = NULL,
    @Tiquete               VARCHAR(MAX)    = NULL
AS
BEGIN
    EXEC [dbo].[Zeus®spze_InformeReembolsos]
        @fecha_inicio     = @fecha_inicio,
        @fecha_fin        = @fecha_fin,
        @cd_cliente       = @cd_cliente,
        @cd_sucursal      = @cd_sucursal,
        @cd_implante      = @cd_implante,
        @cd_tiquete       = @cd_tiquete,
        @cd_vendedor      = @cd_vendedor,
        @cd_tiqueteador   = @cd_tiqueteador,
        @cd_aerolinea     = @cd_aerolinea,
        @cd_PNR           = @cd_PNR,
        @ds_pax           = @ds_pax,
        @cd_centrocosto   = @cd_centrocosto,
        @Nacionalidad     = @Nacionalidad,
        @NacionalidadReal = @NacionalidadReal,
        @MostrarAnulacion = @MostrarAnulacion,
        @clientes         = @clientes,
        @sucursales       = @sucursales,
        @implantes        = @implantes,
        @Tiquete          = @Tiquete;
END
GO

-- 4. Actualización / Wrapper del procedimiento legado original
IF OBJECT_ID('[dbo].[Zeus®_EVTSpza_InformeReembolsos]', 'P') IS NOT NULL
    DROP PROCEDURE [dbo].[Zeus®_EVTSpza_InformeReembolsos]
GO

CREATE PROCEDURE [dbo].[Zeus®_EVTSpza_InformeReembolsos]
    @fecha_inicio   SMALLDATETIME = NULL,
    @fecha_fin      SMALLDATETIME = NULL,
    @sucursales     VARCHAR(MAX)  = NULL,
    @implantes      VARCHAR(MAX)  = NULL,
    @clientes       VARCHAR(MAX)  = NULL,
    @Tiquete        VARCHAR(MAX)  = NULL
AS
BEGIN
    EXEC [dbo].[Zeus®spze_InformeReembolsos]
        @fecha_inicio   = @fecha_inicio,
        @fecha_fin      = @fecha_fin,
        @cd_sucursal    = @sucursales,
        @cd_implante    = @implantes,
        @cd_cliente     = @clientes,
        @cd_tiquete     = @Tiquete;
END
GO
