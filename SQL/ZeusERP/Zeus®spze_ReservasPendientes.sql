USE [ZeusAgencias_23]
GO
/****** Object:  StoredProcedure [dbo].[Zeus®spze_ReservasPendientes] ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

IF OBJECT_ID('[dbo].[Zeus®spze_ReservasPendientes]', 'P') IS NOT NULL
    DROP PROCEDURE [dbo].[Zeus®spze_ReservasPendientes]
GO

CREATE PROCEDURE [dbo].[Zeus®spze_ReservasPendientes] 
    @fecha_inicio              SMALLDATETIME   = NULL,
    @fecha_fin                 SMALLDATETIME   = NULL,
    @cd_cliente                VARCHAR(8000)   = NULL,
    @cd_vendedor               VARCHAR(8000)   = NULL,
    @cd_tiqueteador            VARCHAR(8000)   = NULL,
    @cd_aerolinea              VARCHAR(1000)   = NULL,
    @cd_tiquete                VARCHAR(100)    = NULL,
    @cd_PNR                    VARCHAR(50)     = NULL,
    @ds_pax                    VARCHAR(250)    = NULL,
    @GDS                       VARCHAR(50)     = NULL,
    @cd_centrocosto            VARCHAR(1000)   = NULL,
    @cd_sucursal               VARCHAR(1000)   = NULL,
    @cd_implante               VARCHAR(1000)   = NULL,
    @Nacionalidad              VARCHAR(25)     = NULL,
    @NacionalidadReal          VARCHAR(25)     = NULL,
    @MostrarSoloRevisados      VARCHAR(2)      = NULL,
    @Revisado                  VARCHAR(2)      = NULL,
    -- Compatibilidad con llamadas heredadas originales
    @id_usuario                INT             = NULL,
    @dt_desde                  SMALLDATETIME   = NULL,
    @dt_hasta                  SMALLDATETIME   = NULL,
    @bl_fecha                  BIT             = NULL,
    @bl_tkt                    BIT             = NULL,
    @bl_pax                    BIT             = NULL,
    @bl_pnr                    BIT             = NULL,
    @bl_cliente                BIT             = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET TRANSACTION ISOLATION LEVEL READ UNCOMMITTED;

    -- Normalización de Fechas
    IF @fecha_inicio IS NULL AND @dt_desde IS NOT NULL SET @fecha_inicio = @dt_desde;
    IF @fecha_fin IS NULL AND @dt_hasta IS NOT NULL SET @fecha_fin = @dt_hasta;

    DECLARE @f_inicio DATETIME = CASE WHEN @fecha_inicio IS NOT NULL THEN CAST(CAST(@fecha_inicio AS DATE) AS DATETIME) ELSE NULL END;
    DECLARE @f_fin    DATETIME = CASE WHEN @fecha_fin IS NOT NULL THEN DATEADD(second, 86399, CAST(CAST(@fecha_fin AS DATE) AS DATETIME)) ELSE NULL END;

    -- Normalización de GDS
    DECLARE @gds_id INT = 0;
    IF @GDS IS NOT NULL
    BEGIN
        IF UPPER(LTRIM(RTRIM(@GDS))) IN ('1', 'SABRE') SET @gds_id = 1;
        ELSE IF UPPER(LTRIM(RTRIM(@GDS))) IN ('2', 'AMADEUS') SET @gds_id = 2;
    END;

    -- Normalización de Revisado
    IF @MostrarSoloRevisados IS NULL AND @Revisado IS NOT NULL
        SET @MostrarSoloRevisados = @Revisado;

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

    CREATE TABLE #FiltroSucursales (codigo VARCHAR(100) PRIMARY KEY);
    IF ISNULL(LTRIM(RTRIM(@cd_sucursal)), '') <> '' AND UPPER(@cd_sucursal) <> 'TODOS'
        INSERT INTO #FiltroSucursales (codigo)
        SELECT DISTINCT LTRIM(RTRIM(codigo)) FROM dbo.fnSplit(@cd_sucursal, ',', 0, 1) WHERE LTRIM(RTRIM(codigo)) <> '';

    CREATE TABLE #FiltroImplantes (codigo VARCHAR(100) PRIMARY KEY);
    IF ISNULL(LTRIM(RTRIM(@cd_implante)), '') <> '' AND UPPER(@cd_implante) <> 'TODOS'
        INSERT INTO #FiltroImplantes (codigo)
        SELECT DISTINCT LTRIM(RTRIM(codigo)) FROM dbo.fnSplit(@cd_implante, ',', 0, 1) WHERE LTRIM(RTRIM(codigo)) <> '';

    SELECT 
        @Compania AS [Compania],
        CASE WHEN r.iden_gds = 1 THEN 'Sabre' WHEN r.iden_gds = 2 THEN 'Amadeus' ELSE '' END AS [GDS],
        0 AS [SEL],
        RTRIM(LTRIM(r.cd_codigo)) AS [PNR],
        CONVERT(VARCHAR(10), r.ds_fecha, 120) AS [Fecha],
        'Aire' AS [Tipo],
        RTRIM(LTRIM(tkt.ds_tkt_number)) AS [Tiquete],
        RTRIM(LTRIM(tkt.ds_tkt_prefix)) AS [Prefijo Tiquete],
        RTRIM(LTRIM(ISNULL(tkt.ds_pax_lastnm, '') + ' ' + ISNULL(tkt.ds_pax_firstnm, ''))) AS [Pasajero],
        CASE 
            WHEN tkt.bl_anulado = 0 THEN CASE WHEN ISNULL(tkt.ds_itinerario, '') <> '' THEN tkt.ds_itinerario ELSE r.ds_itinerario END
            WHEN tkt.bl_anulado = 1 THEN 'Anulado'
        END AS [Servicio],
        'Tkt ' + RTRIM(LTRIM(tkt.ds_tkt_number)) + ' - ' + RTRIM(LTRIM(ISNULL(tkt.ds_pax_lastnm, ''))) + ' ' + RTRIM(LTRIM(ISNULL(tkt.ds_pax_firstnm, ''))) AS [Descrip],
        CASE WHEN ISNULL(tkt.ds_itinerario, '') <> '' THEN tkt.ds_itinerario ELSE r.ds_itinerario END AS [Ruta],
        RTRIM(LTRIM(r.ds_clases)) AS [Clase],
        RTRIM(LTRIM(tkt.ds_aero_code)) AS [Cod_Aerolinea],
        ISNULL(E.ds_Alias, ISNULL(p_aero.RAZONCIAL, tkt.ds_aero_code)) AS [Aerolinea],
        RTRIM(LTRIM(COALESCE(NULLIF(r.cd_cliente, ''), r.ds_cliid, ''))) AS [Cod_Cliente],
        COALESCE(NULLIF(C.RAZONCIAL, ''), NULLIF(r.ds_cliname, ''), NULLIF(r.ds_clirazoncial, ''), '') AS [Cliente],
        RTRIM(LTRIM(ISNULL(r.cd_vendedor, ''))) AS [Cod_Vendedor],
        ISNULL(V.NOMBVENDE, '') AS [Vendedor],
        ISNULL(V.Identificacion, '') AS [Identificacion del Vendedor],
        RTRIM(LTRIM(ISNULL(r.cd_tiqueteador, ''))) AS [Cod_Tiqueteador],
        ISNULL(Tq.ds_nombre, '') AS [Tiqueteador],
        RTRIM(LTRIM(tkt.ds_moneda)) AS [Moneda],
        ISNULL(tkt.am_tarifa, 0) AS [Tarifa],
        ISNULL(tkt.am_iva, 0) AS [Iva],
        ISNULL(tkt.am_tua, 0) AS [TUA],
        ISNULL(tkt.am_comb, 0) AS [Combustible],
        ISNULL(tkt.am_vat, 0) AS [Otros],
        (ISNULL(tkt.am_tarifa, 0) + ISNULL(tkt.am_iva, 0) + ISNULL(tkt.am_tua, 0) + ISNULL(tkt.am_comb, 0) + ISNULL(tkt.am_vat, 0)) AS [Total],
        ISNULL(tkt.am_tao, 0) AS [TAO],
        ISNULL(tkt.am_ivatao, 0) AS [Iva TAO],
        ISNULL(tkt.am_cap, 0) AS [CAP],
        ISNULL(tkt.am_ivacap, 0) AS [Iva CAP],
        ISNULL(tkt.am_Comision, 0) AS [Comision],
        CASE WHEN ISNULL(tkt.in_nacionalidad, r.in_nacionalidad) = 1 THEN 'Nacional' ELSE 'Internacional' END AS [Nacionalidad],
        [Nacionalidad Real] = CASE 
            WHEN (CASE WHEN ISNULL(tkt.ds_itinerario, '') <> '' THEN tkt.ds_itinerario ELSE r.ds_itinerario END) IS NOT NULL 
                 AND CHARINDEX('/', REPLACE((CASE WHEN ISNULL(tkt.ds_itinerario, '') <> '' THEN tkt.ds_itinerario ELSE r.ds_itinerario END), '-', '/')) > 0 
                 AND EXISTS (
                    SELECT 1 
                    FROM dbo.fnSplit(REPLACE(REPLACE(UPPER(LTRIM(RTRIM((CASE WHEN ISNULL(tkt.ds_itinerario, '') <> '' THEN tkt.ds_itinerario ELSE r.ds_itinerario END)))), ' ', ''), '-', '/'), '/', 0, 1) s
                    JOIN #TempCiudadesExterior ext ON ext.cd_Iata = s.codigo
                    WHERE LTRIM(RTRIM(s.codigo)) <> ''
                 ) THEN 'Internacional'
            WHEN (CASE WHEN ISNULL(tkt.ds_itinerario, '') <> '' THEN tkt.ds_itinerario ELSE r.ds_itinerario END) IS NOT NULL 
                 AND CHARINDEX('/', REPLACE((CASE WHEN ISNULL(tkt.ds_itinerario, '') <> '' THEN tkt.ds_itinerario ELSE r.ds_itinerario END), '-', '/')) > 0 
                 AND EXISTS (
                    SELECT 1 
                    FROM dbo.fnSplit(REPLACE(REPLACE(UPPER(LTRIM(RTRIM((CASE WHEN ISNULL(tkt.ds_itinerario, '') <> '' THEN tkt.ds_itinerario ELSE r.ds_itinerario END)))), ' ', ''), '-', '/'), '/', 0, 1) s
                    WHERE LTRIM(RTRIM(s.codigo)) <> ''
                 )
                 AND NOT EXISTS (
                    SELECT 1 
                    FROM dbo.fnSplit(REPLACE(REPLACE(UPPER(LTRIM(RTRIM((CASE WHEN ISNULL(tkt.ds_itinerario, '') <> '' THEN tkt.ds_itinerario ELSE r.ds_itinerario END)))), ' ', ''), '-', '/'), '/', 0, 1) s
                    WHERE LTRIM(RTRIM(s.codigo)) <> '' 
                      AND s.codigo NOT IN (SELECT cd_Iata FROM #TempCiudadesColombia)
                 ) THEN 'Nacional'
            WHEN ISNULL(tkt.in_nacionalidad, r.in_nacionalidad) = 1 THEN 'Nacional'
            ELSE 'Internacional'
        END,
        CASE WHEN LTRIM(RTRIM(ISNULL(tkt.cd_tktrevisado, ''))) <> '' THEN 'SI' ELSE 'NO' END AS [Revisado],
        LTRIM(RTRIM(ISNULL(tkt.cd_tktrevisado, ''))) AS [Tkt Revisado],
        RTRIM(LTRIM(ISNULL(r.cd_centrocosto, ''))) AS [CentroCosto],
        RTRIM(LTRIM(ISNULL(r.cd_sucursal, ''))) AS [Sucursal],
        RTRIM(LTRIM(ISNULL(r.cd_implante, ''))) AS [Implante],
        -- Campos técnicos heredados de spza_RptReservasPendientes
        r.id,
        r.iden_gds,
        r.ds_fecha,
        r.cd_tiqueteador,
        r.cd_vendedor,
        r.cd_cliente,
        r.am_highfare,
        r.am_lowfare,
        r.am_fare,
        r.ds_reasoncode,
        r.ds_cliname,
        r.ds_clidir,
        r.ds_clicity,
        r.ds_cliid,
        CASE WHEN ISNULL(tkt.ds_itinerario, '') <> '' THEN tkt.ds_itinerario ELSE r.ds_itinerario END AS [ds_itinerario],
        r.ds_clases,
        tkt.id AS [id_air],
        tkt.ds_pax_number,
        tkt.ds_pax_firstnm,
        tkt.ds_pax_lastnm,
        tkt.ds_pax_prefix,
        tkt.ds_tkt_number,
        tkt.ds_tkt_prefix,
        tkt.ds_aero_code,
        tkt.ds_moneda,
        tkt.am_tarifa,
        tkt.am_iva,
        tkt.am_tua,
        tkt.am_comb,
        tkt.am_vat,
        tkt.ds_cc_code,
        tkt.ds_cc_number,
        tkt.am_tao,
        tkt.am_ivatao,
        tkt.am_cap,
        tkt.am_ivacap,
        tkt.ds_cc_code2,
        tkt.ds_cc_number2,
        tkt.am_fp1,
        tkt.am_fp2,
        tkt.cd_tktrevisado,
        tkt.am_TarifaContado,
        tkt.am_IvaContado,
        tkt.am_OtrosContado,
        tkt.am_TarifaCredito,
        tkt.am_IvaCredito,
        tkt.am_OtrosCredito,
        tkt.am_Comision,
        '' AS [Respuesta],
        r.in_nacionalidad,
        r.cd_clitipodoc,
        r.cd_clitipotercero,
        r.ds_clirazoncial,
        r.ds_cliname2,
        r.ds_clilastname,
        r.ds_clilastname2,
        r.cd_clipais,
        r.ds_clitel,
        r.cd_TipoTransaccion,
        ISNULL(E.ds_Alias, '') AS [ds_Aerolinea],
        ISNULL(C.RAZONCIAL, '') AS [ds_Cliente],
        ISNULL(Tq.ds_nombre, '') AS [ds_Tiqueteador]
    FROM dbo.ReservasGDS r WITH(NOLOCK)
    INNER JOIN dbo.ReservaGDS_Detalles tkt WITH(NOLOCK) ON (r.id = tkt.id_reserva)
    LEFT JOIN dbo.Tiquetes t WITH(NOLOCK) ON t.cd_tiquete = tkt.ds_tkt_number 
    LEFT JOIN dbo.Entidades E WITH(NOLOCK) ON (E.cd_siglas = tkt.ds_aero_code OR E.cd_codigo = tkt.ds_aero_code)
    LEFT JOIN dbo.PROVEEDORES p_aero WITH(NOLOCK) ON (p_aero.IDPROVE = E.cd_proveedor)
    LEFT JOIN dbo.Clientes C WITH(NOLOCK) ON (C.IDCLIENTE = r.cd_cliente OR C.IDCLIENTE = r.ds_cliid)
    LEFT JOIN dbo.MAEVENDE V WITH(NOLOCK) ON (V.IDVENDE = r.cd_vendedor)
    LEFT JOIN dbo.Tiqueteadores Tq WITH(NOLOCK) ON (Tq.cd_codigo = r.cd_tiqueteador OR Tq.cd_alterno = r.cd_tiqueteador)
    WHERE tkt.bl_usada = 0
      AND (t.id_fac_factura IS NULL AND t.id_fac_remision IS NULL AND ISNULL(t.in_estado, 0) = 0)
      AND tkt.bl_anulado = 0
      -- Filtro Fechas
      AND (@f_inicio IS NULL OR r.ds_fecha >= @f_inicio)
      AND (@f_fin IS NULL OR r.ds_fecha <= @f_fin)
      -- Filtro GDS
      AND (@gds_id = 0 OR r.iden_gds = @gds_id)
      -- Filtro PNR
      AND (@cd_PNR IS NULL OR LTRIM(RTRIM(@cd_PNR)) = '' OR r.cd_codigo LIKE '%' + LTRIM(RTRIM(@cd_PNR)) + '%')
      -- Filtro Tiquete
      AND (@cd_tiquete IS NULL OR LTRIM(RTRIM(@cd_tiquete)) = '' OR tkt.ds_tkt_number LIKE '%' + LTRIM(RTRIM(@cd_tiquete)) + '%')
      -- Filtro Pasajero
      AND (@ds_pax IS NULL OR LTRIM(RTRIM(@ds_pax)) = '' OR (tkt.ds_pax_firstnm + ' ' + tkt.ds_pax_lastnm LIKE '%' + LTRIM(RTRIM(@ds_pax)) + '%') OR (tkt.ds_pax_lastnm + ' ' + tkt.ds_pax_firstnm LIKE '%' + LTRIM(RTRIM(@ds_pax)) + '%'))
      -- Filtro Clientes multi-valor
      AND (NOT EXISTS (SELECT 1 FROM #FiltroClientes) OR r.cd_cliente IN (SELECT codigo FROM #FiltroClientes) OR r.ds_cliid IN (SELECT codigo FROM #FiltroClientes))
      -- Filtro Vendedores multi-valor
      AND (NOT EXISTS (SELECT 1 FROM #FiltroVendedores) OR r.cd_vendedor IN (SELECT codigo FROM #FiltroVendedores))
      -- Filtro Tiqueteadores multi-valor
      AND (NOT EXISTS (SELECT 1 FROM #FiltroTiqueteadores) OR r.cd_tiqueteador IN (SELECT codigo FROM #FiltroTiqueteadores))
      -- Filtro Aerolíneas multi-valor
      AND (NOT EXISTS (SELECT 1 FROM #FiltroAerolineas) OR tkt.ds_aero_code IN (SELECT codigo FROM #FiltroAerolineas) OR E.cd_codigo IN (SELECT codigo FROM #FiltroAerolineas) OR E.cd_siglas IN (SELECT codigo FROM #FiltroAerolineas))
      -- Filtro Centros de Costo multi-valor
      AND (NOT EXISTS (SELECT 1 FROM #FiltroCentrosCosto) OR r.cd_centrocosto IN (SELECT codigo FROM #FiltroCentrosCosto))
      -- Filtro Sucursales multi-valor
      AND (NOT EXISTS (SELECT 1 FROM #FiltroSucursales) OR r.cd_sucursal IN (SELECT codigo FROM #FiltroSucursales))
      -- Filtro Implantes multi-valor
      AND (NOT EXISTS (SELECT 1 FROM #FiltroImplantes) OR r.cd_implante IN (SELECT codigo FROM #FiltroImplantes))
      -- Filtro Revisados
      AND (
          @MostrarSoloRevisados IS NULL OR UPPER(LTRIM(RTRIM(@MostrarSoloRevisados))) IN ('', 'TODOS')
          OR (UPPER(LTRIM(RTRIM(@MostrarSoloRevisados))) = 'SI' AND LTRIM(RTRIM(ISNULL(tkt.cd_tktrevisado, ''))) <> '')
          OR (UPPER(LTRIM(RTRIM(@MostrarSoloRevisados))) = 'NO' AND LTRIM(RTRIM(ISNULL(tkt.cd_tktrevisado, ''))) = '')
      )
      -- Filtro Nacionalidad Original
      AND (
          @Nacionalidad IS NULL OR UPPER(LTRIM(RTRIM(@Nacionalidad))) IN ('', 'TODOS')
          OR (UPPER(LTRIM(RTRIM(@Nacionalidad))) IN ('NACIONAL', '1') AND ISNULL(tkt.in_nacionalidad, r.in_nacionalidad) = 1)
          OR (UPPER(LTRIM(RTRIM(@Nacionalidad))) IN ('INTERNACIONAL', '2') AND ISNULL(tkt.in_nacionalidad, r.in_nacionalidad) <> 1)
      )
      -- Filtro Nacionalidad Real
      AND (
          @NacionalidadReal IS NULL OR UPPER(LTRIM(RTRIM(@NacionalidadReal))) IN ('', 'TODOS')
          OR (
              UPPER(LTRIM(RTRIM(@NacionalidadReal))) = 'INTERNACIONAL'
              AND (
                  (
                      (CASE WHEN ISNULL(tkt.ds_itinerario, '') <> '' THEN tkt.ds_itinerario ELSE r.ds_itinerario END) IS NOT NULL
                      AND CHARINDEX('/', REPLACE((CASE WHEN ISNULL(tkt.ds_itinerario, '') <> '' THEN tkt.ds_itinerario ELSE r.ds_itinerario END), '-', '/')) > 0
                      AND EXISTS (
                          SELECT 1
                          FROM dbo.fnSplit(REPLACE(REPLACE(UPPER(LTRIM(RTRIM((CASE WHEN ISNULL(tkt.ds_itinerario, '') <> '' THEN tkt.ds_itinerario ELSE r.ds_itinerario END)))), ' ', ''), '-', '/'), '/', 0, 1) s
                          JOIN #TempCiudadesExterior ext ON ext.cd_Iata = s.codigo
                          WHERE LTRIM(RTRIM(s.codigo)) <> ''
                      )
                  )
                  OR (
                      (
                          (CASE WHEN ISNULL(tkt.ds_itinerario, '') <> '' THEN tkt.ds_itinerario ELSE r.ds_itinerario END) IS NULL
                          OR CHARINDEX('/', REPLACE((CASE WHEN ISNULL(tkt.ds_itinerario, '') <> '' THEN tkt.ds_itinerario ELSE r.ds_itinerario END), '-', '/')) = 0
                      )
                      AND ISNULL(tkt.in_nacionalidad, r.in_nacionalidad) <> 1
                  )
              )
          )
          OR (
              UPPER(LTRIM(RTRIM(@NacionalidadReal))) = 'NACIONAL'
              AND (
                  (
                      (CASE WHEN ISNULL(tkt.ds_itinerario, '') <> '' THEN tkt.ds_itinerario ELSE r.ds_itinerario END) IS NOT NULL
                      AND CHARINDEX('/', REPLACE((CASE WHEN ISNULL(tkt.ds_itinerario, '') <> '' THEN tkt.ds_itinerario ELSE r.ds_itinerario END), '-', '/')) > 0
                      AND NOT EXISTS (
                          SELECT 1
                          FROM dbo.fnSplit(REPLACE(REPLACE(UPPER(LTRIM(RTRIM((CASE WHEN ISNULL(tkt.ds_itinerario, '') <> '' THEN tkt.ds_itinerario ELSE r.ds_itinerario END)))), ' ', ''), '-', '/'), '/', 0, 1) s
                          JOIN #TempCiudadesExterior ext ON ext.cd_Iata = s.codigo
                          WHERE LTRIM(RTRIM(s.codigo)) <> ''
                      )
                  )
                  OR (
                      (
                          (CASE WHEN ISNULL(tkt.ds_itinerario, '') <> '' THEN tkt.ds_itinerario ELSE r.ds_itinerario END) IS NULL
                          OR CHARINDEX('/', REPLACE((CASE WHEN ISNULL(tkt.ds_itinerario, '') <> '' THEN tkt.ds_itinerario ELSE r.ds_itinerario END), '-', '/')) = 0
                      )
                      AND ISNULL(tkt.in_nacionalidad, r.in_nacionalidad) = 1
                  )
              )
          )
      )
    ORDER BY r.ds_fecha DESC, r.cd_codigo, tkt.ds_tkt_number;

    -- Limpieza de tablas temporales
    IF OBJECT_ID('tempdb..#TempCiudadesExterior') IS NOT NULL DROP TABLE #TempCiudadesExterior;
    IF OBJECT_ID('tempdb..#TempCiudadesColombia') IS NOT NULL DROP TABLE #TempCiudadesColombia;
    IF OBJECT_ID('tempdb..#FiltroClientes') IS NOT NULL DROP TABLE #FiltroClientes;
    IF OBJECT_ID('tempdb..#FiltroVendedores') IS NOT NULL DROP TABLE #FiltroVendedores;
    IF OBJECT_ID('tempdb..#FiltroTiqueteadores') IS NOT NULL DROP TABLE #FiltroTiqueteadores;
    IF OBJECT_ID('tempdb..#FiltroAerolineas') IS NOT NULL DROP TABLE #FiltroAerolineas;
    IF OBJECT_ID('tempdb..#FiltroCentrosCosto') IS NOT NULL DROP TABLE #FiltroCentrosCosto;
    IF OBJECT_ID('tempdb..#FiltroSucursales') IS NOT NULL DROP TABLE #FiltroSucursales;
    IF OBJECT_ID('tempdb..#FiltroImplantes') IS NOT NULL DROP TABLE #FiltroImplantes;
END
GO

-- 2. Procedimiento Homólogo / Alias sin caracteres especiales
IF OBJECT_ID('[dbo].[spze_ReservasPendientes]', 'P') IS NOT NULL
    DROP PROCEDURE [dbo].[spze_ReservasPendientes]
GO

CREATE PROCEDURE [dbo].[spze_ReservasPendientes]
    @fecha_inicio              SMALLDATETIME   = NULL,
    @fecha_fin                 SMALLDATETIME   = NULL,
    @cd_cliente                VARCHAR(8000)   = NULL,
    @cd_vendedor               VARCHAR(8000)   = NULL,
    @cd_tiqueteador            VARCHAR(8000)   = NULL,
    @cd_aerolinea              VARCHAR(1000)   = NULL,
    @cd_tiquete                VARCHAR(100)    = NULL,
    @cd_PNR                    VARCHAR(50)     = NULL,
    @ds_pax                    VARCHAR(250)    = NULL,
    @GDS                       VARCHAR(50)     = NULL,
    @cd_centrocosto            VARCHAR(1000)   = NULL,
    @cd_sucursal               VARCHAR(1000)   = NULL,
    @cd_implante               VARCHAR(1000)   = NULL,
    @Nacionalidad              VARCHAR(25)     = NULL,
    @NacionalidadReal          VARCHAR(25)     = NULL,
    @MostrarSoloRevisados      VARCHAR(2)      = NULL,
    @Revisado                  VARCHAR(2)      = NULL,
    @id_usuario                INT             = NULL,
    @dt_desde                  SMALLDATETIME   = NULL,
    @dt_hasta                  SMALLDATETIME   = NULL,
    @bl_fecha                  BIT             = NULL,
    @bl_tkt                    BIT             = NULL,
    @bl_pax                    BIT             = NULL,
    @bl_pnr                    BIT             = NULL,
    @bl_cliente                BIT             = NULL
AS
BEGIN
    EXEC [dbo].[Zeus®spze_ReservasPendientes]
        @fecha_inicio         = @fecha_inicio,
        @fecha_fin            = @fecha_fin,
        @cd_cliente           = @cd_cliente,
        @cd_vendedor          = @cd_vendedor,
        @cd_tiqueteador       = @cd_tiqueteador,
        @cd_aerolinea         = @cd_aerolinea,
        @cd_tiquete           = @cd_tiquete,
        @cd_PNR               = @cd_PNR,
        @ds_pax               = @ds_pax,
        @GDS                  = @GDS,
        @cd_centrocosto       = @cd_centrocosto,
        @cd_sucursal          = @cd_sucursal,
        @cd_implante          = @cd_implante,
        @Nacionalidad         = @Nacionalidad,
        @NacionalidadReal     = @NacionalidadReal,
        @MostrarSoloRevisados = @MostrarSoloRevisados,
        @Revisado             = @Revisado,
        @id_usuario           = @id_usuario,
        @dt_desde             = @dt_desde,
        @dt_hasta             = @dt_hasta,
        @bl_fecha             = @bl_fecha,
        @bl_tkt               = @bl_tkt,
        @bl_pax               = @bl_pax,
        @bl_pnr               = @bl_pnr,
        @bl_cliente           = @bl_cliente;
END
GO

-- 3. Procedimiento Homólogo / Alias simple
IF OBJECT_ID('[dbo].[ReservasPendientes]', 'P') IS NOT NULL
    DROP PROCEDURE [dbo].[ReservasPendientes]
GO

CREATE PROCEDURE [dbo].[ReservasPendientes]
    @fecha_inicio              SMALLDATETIME   = NULL,
    @fecha_fin                 SMALLDATETIME   = NULL,
    @cd_cliente                VARCHAR(8000)   = NULL,
    @cd_vendedor               VARCHAR(8000)   = NULL,
    @cd_tiqueteador            VARCHAR(8000)   = NULL,
    @cd_aerolinea              VARCHAR(1000)   = NULL,
    @cd_tiquete                VARCHAR(100)    = NULL,
    @cd_PNR                    VARCHAR(50)     = NULL,
    @ds_pax                    VARCHAR(250)    = NULL,
    @GDS                       VARCHAR(50)     = NULL,
    @cd_centrocosto            VARCHAR(1000)   = NULL,
    @cd_sucursal               VARCHAR(1000)   = NULL,
    @cd_implante               VARCHAR(1000)   = NULL,
    @Nacionalidad              VARCHAR(25)     = NULL,
    @NacionalidadReal          VARCHAR(25)     = NULL,
    @MostrarSoloRevisados      VARCHAR(2)      = NULL,
    @Revisado                  VARCHAR(2)      = NULL,
    @id_usuario                INT             = NULL,
    @dt_desde                  SMALLDATETIME   = NULL,
    @dt_hasta                  SMALLDATETIME   = NULL,
    @bl_fecha                  BIT             = NULL,
    @bl_tkt                    BIT             = NULL,
    @bl_pax                    BIT             = NULL,
    @bl_pnr                    BIT             = NULL,
    @bl_cliente                BIT             = NULL
AS
BEGIN
    EXEC [dbo].[Zeus®spze_ReservasPendientes]
        @fecha_inicio         = @fecha_inicio,
        @fecha_fin            = @fecha_fin,
        @cd_cliente           = @cd_cliente,
        @cd_vendedor          = @cd_vendedor,
        @cd_tiqueteador       = @cd_tiqueteador,
        @cd_aerolinea         = @cd_aerolinea,
        @cd_tiquete           = @cd_tiquete,
        @cd_PNR               = @cd_PNR,
        @ds_pax               = @ds_pax,
        @GDS                  = @GDS,
        @cd_centrocosto       = @cd_centrocosto,
        @cd_sucursal          = @cd_sucursal,
        @cd_implante          = @cd_implante,
        @Nacionalidad         = @Nacionalidad,
        @NacionalidadReal     = @NacionalidadReal,
        @MostrarSoloRevisados = @MostrarSoloRevisados,
        @Revisado             = @Revisado,
        @id_usuario           = @id_usuario,
        @dt_desde             = @dt_desde,
        @dt_hasta             = @dt_hasta,
        @bl_fecha             = @bl_fecha,
        @bl_tkt               = @bl_tkt,
        @bl_pax               = @bl_pax,
        @bl_pnr               = @bl_pnr,
        @bl_cliente           = @bl_cliente;
END
GO
