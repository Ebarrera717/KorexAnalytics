USE [ZeusAgencias_23]
GO
/****** Object:  StoredProcedure [dbo].[Zeus®spze_VentasDetalladasPorConceptos_FiltroRutas] ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

IF OBJECT_ID('[dbo].[Zeus®spze_VentasDetalladasPorConceptos_FiltroRutas]', 'P') IS NOT NULL
    DROP PROCEDURE [dbo].[Zeus®spze_VentasDetalladasPorConceptos_FiltroRutas]
GO

-- 1. Tabla de Configuración de Reglas de Fare Basis por Aerolínea
IF OBJECT_ID('dbo.KAX_FareBasisRule', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.[KAX_FareBasisRule] (
        [id] INT IDENTITY(1,1) NOT NULL,
        [airlineCode] NVARCHAR(20) NOT NULL,
        [airlineName] NVARCHAR(150) NOT NULL,
        [startPos] INT NOT NULL DEFAULT 1,
        [length] INT NOT NULL DEFAULT 2,
        [separator] NVARCHAR(10) NOT NULL DEFAULT '/',
        [isActive] BIT NOT NULL DEFAULT 1,
        [createdAt] DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
        [updatedAt] DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
        CONSTRAINT [PK_KAX_FareBasisRule] PRIMARY KEY CLUSTERED ([id] ASC),
        CONSTRAINT [UQ_KAX_FareBasisRule_Code] UNIQUE NONCLUSTERED ([airlineCode] ASC)
    );

    INSERT INTO dbo.[KAX_FareBasisRule] ([airlineCode], [airlineName], [startPos], [length], [separator], [isActive])
    VALUES ('001', 'American Airlines', 3, 2, '/', 1);
END;
GO

-- 2. Función Escalar Universal de Cálculo de FarebasisReal
IF OBJECT_ID('dbo.fnKAX_CalcularFarebasisReal', 'FN') IS NOT NULL
    DROP FUNCTION dbo.fnKAX_CalcularFarebasisReal;
GO

CREATE FUNCTION dbo.fnKAX_CalcularFarebasisReal
(
    @fareBasisOriginal NVARCHAR(500),
    @startPos INT,
    @length INT,
    @separator NVARCHAR(10) = '/'
)
RETURNS NVARCHAR(500)
AS
BEGIN
    IF @fareBasisOriginal IS NULL OR TRIM(@fareBasisOriginal) = ''
        RETURN @fareBasisOriginal;

    SET @separator = COALESCE(NULLIF(TRIM(@separator), ''), '/');
    SET @startPos = CASE WHEN @startPos < 1 THEN 1 ELSE @startPos END;
    SET @length = CASE WHEN @length < 1 THEN 1 ELSE @length END;

    DECLARE @resultado NVARCHAR(500) = '';
    DECLARE @restante NVARCHAR(500) = @fareBasisOriginal;
    DECLARE @pos INT;
    DECLARE @segmento NVARCHAR(200);
    DECLARE @transformado NVARCHAR(200);

    WHILE CHARINDEX(@separator, @restante) > 0
    BEGIN
        SET @pos = CHARINDEX(@separator, @restante);
        SET @segmento = SUBSTRING(@restante, 1, @pos - 1);
        SET @restante = SUBSTRING(@restante, @pos + LEN(@separator), LEN(@restante));

        SET @transformado = SUBSTRING(@segmento, @startPos, @length);
        SET @resultado = @resultado + @transformado + @separator;
    END;

    SET @segmento = @restante;
    SET @transformado = SUBSTRING(@segmento, @startPos, @length);
    SET @resultado = @resultado + @transformado;

    RETURN @resultado;
END;
GO

-- 3. Función Auxiliar de Obtención Dinámica de FarebasisReal para Tiquetes
IF OBJECT_ID('dbo.fnza_Get_TiqueteFarebasisReal', 'FN') IS NOT NULL
    DROP FUNCTION dbo.fnza_Get_TiqueteFarebasisReal;
GO

CREATE FUNCTION dbo.fnza_Get_TiqueteFarebasisReal
(
    @id_tiquete INT,
    @fareBasisOriginal VARCHAR(200),
    @entVendedora VARCHAR(100)
)
RETURNS VARCHAR(200)
AS
BEGIN
    IF @fareBasisOriginal IS NULL OR LTRIM(RTRIM(@fareBasisOriginal)) = ''
        RETURN @fareBasisOriginal;

    DECLARE @startPos INT = NULL, @length INT = NULL, @separator VARCHAR(10) = '/';

    -- El código de la aerolínea son los primeros 3 dígitos de ENTVENDEDORA (o cd_EntVend o cd_tiquete)
    DECLARE @prefix3 VARCHAR(10) = CASE 
        WHEN @entVendedora IS NOT NULL AND LEN(LTRIM(RTRIM(@entVendedora))) >= 3 
            THEN SUBSTRING(LTRIM(RTRIM(@entVendedora)), 1, 3)
        ELSE NULL
    END;

    -- Buscar regla activa en KAX_FareBasisRule
    SELECT TOP 1 
        @startPos = r.startPos,
        @length = r.length,
        @separator = COALESCE(NULLIF(r.separator, ''), '/')
    FROM dbo.KAX_FareBasisRule r
    WHERE r.isActive = 1
      AND (
          (@prefix3 IS NOT NULL AND r.airlineCode = @prefix3)
          OR (@entVendedora IS NOT NULL AND (@entVendedora LIKE '%' + r.airlineCode + '%' OR @entVendedora LIKE '%' + r.airlineName + '%'))
          OR EXISTS (
              SELECT 1 FROM dbo.Tiquetes_Itinerarios ti
              WHERE ti.id_Tiquetes = @id_tiquete 
                AND (ti.cd_aero_siglas = r.airlineCode OR ti.cd_aero_siglas = r.airlineName)
          )
      )
    ORDER BY 
        CASE 
            WHEN @prefix3 IS NOT NULL AND r.airlineCode = @prefix3 THEN 1
            WHEN @entVendedora IS NOT NULL AND @entVendedora LIKE '%' + r.airlineCode + '%' THEN 2
            ELSE 3
        END;

    -- Si no existe regla configurada y activa, devolver el Fare Basis original
    IF @startPos IS NULL
        RETURN @fareBasisOriginal;

    RETURN dbo.fnKAX_CalcularFarebasisReal(@fareBasisOriginal, @startPos, @length, @separator);
END;
GO

-- 4. Función Auxiliar de Obtención Dinámica de Número de Reembolso para Tiquetes
IF OBJECT_ID('dbo.fnza_Get_TiqueteReembolso', 'FN') IS NOT NULL
    DROP FUNCTION dbo.fnza_Get_TiqueteReembolso;
GO

CREATE FUNCTION dbo.fnza_Get_TiqueteReembolso
(
    @cd_tiquete VARCHAR(50)
)
RETURNS VARCHAR(50)
AS
BEGIN
    IF @cd_tiquete IS NULL OR LTRIM(RTRIM(@cd_tiquete)) = ''
        RETURN NULL;

    DECLARE @res VARCHAR(50);

    SELECT TOP 1 
        @res = RTRIM(LTRIM(r.cd_fuente)) + '-' + RTRIM(LTRIM(ISNULL(r.cd_serie, ''))) + RTRIM(LTRIM(ISNULL(r.cd_consecutivo, '')))
    FROM dbo.Reembolsos r WITH (NOLOCK)
    WHERE LTRIM(RTRIM(r.cd_tiquete)) = LTRIM(RTRIM(@cd_tiquete))
    ORDER BY CASE WHEN r.id_usuario_anul IS NULL THEN 0 ELSE 1 END, r.id DESC;

    RETURN @res;
END;
GO

CREATE PROCEDURE [dbo].[Zeus®spze_VentasDetalladasPorConceptos_FiltroRutas]
		@Nacionalidad 				VARCHAR(25)		= NULL	
		,@Remision 					VARCHAR(25)		= NULL	
		,@RemFacturadas				VARCHAR(25)		= NULL	
		,@FacGeneradasRem			VARCHAR(25)		= NULL	
		,@SoloConceptosVenta		VARCHAR(2)		= NULL
		,@fecha_inicio				SMALLDATETIME	= NULL
		,@fecha_fin					SMALLDATETIME	= NULL
		,@cd_sucursal				VARCHAR(1000)	= NULL
		,@cd_implante				VARCHAR(1000)	= NULL
		,@Grupo_Empresarial			VARCHAR(8000)	= NULL
		,@cd_Tercero				VARCHAR(8000)	= NULL
		,@cd_cliente				VARCHAR(8000)	= NULL
		,@cd_vendedor				VARCHAR(8000)	= NULL
		,@cd_ConceptoFacturacion	VARCHAR(8000)	= NULL
		,@cd_Tiqueteador			VARCHAR(8000)	= NULL
		,@cd_tipoCliente			VARCHAR(1000)	= NULL
		,@cd_proveedor				VARCHAR(8000)	= NULL
		,@id_Segmento				VARCHAR(8000)	= NULL
		,@ds_variables				VARCHAR(MAX)	= NULL
		,@ds_TipoProveedores		VARCHAR(max)	= NULL
		,@ds_EtapasCotizacion		VARCHAR(max)	= NULL
		,@ds_tipoventa				VARCHAR(max)	= NULL
		,@ds_conceptosAdicional		VARCHAR(max)	= NULL
		,@ds_cargosdescAdicional	VARCHAR(max)	= NULL
		,@ds_impretAdicional		VARCHAR(max)	= NULL
		,@NoMostrarFeeOcultos		VARCHAR(2)		= NULL 
		,@ds_conceptosunificados	VARCHAR(max)	= NULL
		,@MostrarCombustible		VARCHAR(2)		= NULL
		,@MostrarTAOCEMColumnas		VARCHAR(2)		= NULL
		,@ds_Categorias				VARCHAR(MAX)	= NULL
		,@PorFechaDocumento			VARCHAR(2)		= NULL
		,@MostrarAnulacion			VARCHAR(2)		= NULL
		,@cd_CiudadOrigen			VARCHAR(1000)	= NULL -- Filtro 1: Primera ciudad (origen del viaje)
		,@cd_SegundaCiudad			VARCHAR(1000)	= NULL -- Filtro 2: Segunda ciudad del itinerario
		,@cd_CiudadItinerario		VARCHAR(1000)	= NULL -- Filtro 3: Ciudad en cualquier parte del itinerario
		,@fecha_salida_inicio		SMALLDATETIME	= NULL -- Filtro Salida: Solo Año-Mes-Día (Desde)
		,@fecha_salida_fin			SMALLDATETIME	= NULL -- Filtro Salida: Solo Año-Mes-Día (Hasta)
		,@fecha_llegada_inicio		SMALLDATETIME	= NULL -- Filtro Llegada: Solo Año-Mes-Día (Desde)
		,@fecha_llegada_fin			SMALLDATETIME	= NULL -- Filtro Llegada: Solo Año-Mes-Día (Hasta)
		,@id_TiposDocumento			VARCHAR(8000)	= NULL -- Filtro Tipos de Documento por ID (ej: '303', '1,303')
		,@cd_TipoDocumento			VARCHAR(8000)	= NULL -- Filtro Tipos de Documento por Código (ej: 'EMD', 'TBS,TKN')
		,@cd_FareBasis				VARCHAR(8000)	= NULL -- Filtro Fare Basis
		,@MostrarSoloRevisados		VARCHAR(2)		= NULL -- Filtro Revisados: 'SI' (solo revisados), 'NO' (solo no revisados)
		,@Revisado					VARCHAR(2)		= NULL -- Alias alternativo para @MostrarSoloRevisados
		,@cd_PaisOrigen				VARCHAR(1000)	= NULL -- Filtro País Origen: ISO, Nombre o ID del país de la primera ciudad
		,@cd_PaisDestino			VARCHAR(1000)	= NULL -- Filtro País Destino: ISO, Nombre o ID del país de la última ciudad
		,@cd_PaisItinerario			VARCHAR(1000)	= NULL -- Filtro País Itinerario: ISO, Nombre o ID del país en cualquier ciudad de la ruta
		,@NacionalidadReal			VARCHAR(25)		= NULL -- Filtro Nacionalidad Real: 'Todos', 'Nacional', 'Internacional'
		,@cd_FarebasisReal			VARCHAR(8000)	= NULL -- Filtro FarebasisReal (calculado por regla de aerolínea)
		,@MostrarSoloReembolsos		VARCHAR(2)		= NULL -- Filtro Reembolsos: 'SI' (solo con reembolso), 'NO' (solo sin reembolso), 'TODOS' o NULL
		,@SoloReembolsos			VARCHAR(2)		= NULL -- Alias alternativo para @MostrarSoloReembolsos

AS 
BEGIN

	SET NOCOUNT ON;
	SET TRANSACTION ISOLATION LEVEL READ UNCOMMITTED;
	SET CONCAT_NULL_YIELDS_NULL OFF;

	DECLARE 
		@in_nacionalidad INT, @Descuento INT,@Anulacion INT,@FechaDocumento	INT, @in_Remision INT, @in_RemFacturadas INT,@in_FacGeneradasRem INT, @id_Concepto_facturacion VARCHAR(5000)
		,@Id_Sucursales VARCHAR(5000),@Id_Implantes VARCHAR(5000),@id_Tiqueteador VARCHAR(8000),@in_MostrarCombustible INT,@in_MostrarTAOCEMColumnas INT
	
	Declare @Id_EtapasCotizacion Varchar(250),@Id_TiposVenta Varchar(500)
	Declare @TableProveedores Table(Id int identity, TipoProveedor Varchar(250))
	Declare @TableVariables Table(Id int identity, Variable Varchar(250))
	Declare @SelectData Varchar(MAX)
	
	Declare @TableconceptosAdicional Table(Id int identity,id_ConceptoFac INT,cd_ConceptoFac CHAR(3), ds_ConceptoFac VARCHAR(50),id_TipoConceptoFac INT,id_CargoDesc INT,cd_CargoDesc CHAR(3),ds_CargoDesc VARCHAR(50),id_ImpRet INT,cd_ImpRet CHAR(3),ds_ImpRet VARCHAR(50))
	Declare @TablecargosdescAdicional Table(Id int identity,id_CargosDesc INT,cd_CargosDesc CHAR(3),ds_CargosDesc VARCHAR(50))
	Declare @TableimpretAdicional Table(Id int identity,id_ImpRet INT,cd_ImpRet CHAR(3),ds_ImpRet VARCHAR(50))
	Declare @ds_conceptosAdicionalFac VARCHAR(max)
	Declare @ds_conceptosAdicionalRem VARCHAR(max)
	Declare @ds_conceptosAdicionalCot VARCHAR(max) 
	Declare @ds_conceptosAdicionalAux VARCHAR(max)
	Declare @ds_conceptosAdicionalAuxUSD VARCHAR(max)
	Declare @ds_conceptosAdicionalAux2 VARCHAR(max)
	Declare @ds_conceptosAdicionalAux2USD VARCHAR(max)

	Declare @Tableconceptosunificados Table(Id int identity,id_ConceptoFac INT,cd_ConceptoFac CHAR(3), ds_ConceptoFac VARCHAR(50),id_TipoConceptoFac INT)
	Declare @ds_conceptosUnificadosFac VARCHAR(max)
	Declare @ds_conceptosUnificadosRem VARCHAR(max)
	Declare @ds_conceptosUnificadosCot VARCHAR(max) 
	Declare @ds_conceptosUnificadosAux VARCHAR(max)
	Declare @ds_conceptosUnificadosAuxUSD VARCHAR(max)
	Declare @ds_conceptosUnificadosAux2 VARCHAR(max)

	Declare @ds_feeocultos VARCHAR(MAX)
	Declare @FAREBASIS VARCHAR(MAX)
	Declare @TableCategorias Table(Id INT IDENTITY, id_Categoria INT, cd_Categoria VARCHAR(60))
	
	IF @NoMostrarFeeOcultos='SI'
		SELECT @ds_feeocultos = LTRIM(Valor) From dbo.parametros Where id=507   
	ELSE
		SET @ds_feeocultos = NULL
	 
	Select @Descuento = 1, @FechaDocumento = 0, @Anulacion=0

	IF @Nacionalidad = 'Nacional'
		SET @in_nacionalidad = 1
	ELSE IF @Nacionalidad = 'Internacional'
		SET @in_nacionalidad = 2
	ELSE
		SET @in_nacionalidad = 3

	IF @PorFechaDocumento = 'SI'
		SET @FechaDocumento = 1
	ELSE
		SET @FechaDocumento = 0 

	IF @Remision = 'SI'
		SET @in_Remision = 1
	ELSE
		SET @in_Remision = 0 

	IF @RemFacturadas = 'SI'
		SET @in_RemFacturadas = 1
	ELSE
		SET @in_RemFacturadas = 0 

	IF @FacGeneradasRem = 'SI'
		SET @in_FacGeneradasRem = 1
	ELSE
		SET @in_FacGeneradasRem = 0
	
	IF @MostrarCombustible = 'SI'
		SET @in_MostrarCombustible = 1
	ELSE
		SET @in_MostrarCombustible = 0 
 
	IF @MostrarTAOCEMColumnas = 'SI' 
		SET @in_MostrarTAOCEMColumnas = 1
	ELSE
		SET @in_MostrarTAOCEMColumnas = 0
		
	IF @MostrarAnulacion = 'SI'
		SET @Anulacion = 1
	ELSE
		SET @Anulacion = 0

	-- Limpieza de parámetros de rutas
	SET @cd_CiudadOrigen = LTRIM(RTRIM(NULLIF(@cd_CiudadOrigen, '')))
	SET @cd_SegundaCiudad = LTRIM(RTRIM(NULLIF(@cd_SegundaCiudad, '')))
	SET @cd_CiudadItinerario = LTRIM(RTRIM(NULLIF(@cd_CiudadItinerario, '')))

	-- Limpieza y configuración de nuevos filtros (Fare Basis, Revisados, Países)
	IF @MostrarSoloRevisados IS NULL AND @Revisado IS NOT NULL
		SET @MostrarSoloRevisados = @Revisado;

	SET @MostrarSoloRevisados = UPPER(LTRIM(RTRIM(NULLIF(@MostrarSoloRevisados, ''))));

	IF @MostrarSoloReembolsos IS NULL AND @SoloReembolsos IS NOT NULL
		SET @MostrarSoloReembolsos = @SoloReembolsos;

	SET @MostrarSoloReembolsos = UPPER(LTRIM(RTRIM(NULLIF(@MostrarSoloReembolsos, ''))));
	IF @MostrarSoloReembolsos IN ('1', 'TRUE', 'S') SET @MostrarSoloReembolsos = 'SI';
	IF @MostrarSoloReembolsos IN ('0', 'FALSE', 'N') SET @MostrarSoloReembolsos = 'NO';
	IF @MostrarSoloReembolsos IN ('TODOS', 'ALL') SET @MostrarSoloReembolsos = NULL;
	SET @cd_FareBasis = LTRIM(RTRIM(NULLIF(@cd_FareBasis, '')));
	SET @cd_FarebasisReal = LTRIM(RTRIM(NULLIF(@cd_FarebasisReal, '')));
	IF @cd_FarebasisReal IN ('TODOS', 'ALL', '0') SET @cd_FarebasisReal = NULL;
	SET @cd_PaisOrigen = LTRIM(RTRIM(NULLIF(@cd_PaisOrigen, '')));
	SET @cd_PaisDestino = LTRIM(RTRIM(NULLIF(@cd_PaisDestino, '')));
	SET @cd_PaisItinerario = LTRIM(RTRIM(NULLIF(@cd_PaisItinerario, '')));

	SET @NacionalidadReal = UPPER(LTRIM(RTRIM(NULLIF(@NacionalidadReal, ''))));
	IF @NacionalidadReal IN ('TODOS', 'ALL', '0') SET @NacionalidadReal = NULL;
	IF @NacionalidadReal IN ('NACIONAL', '1') SET @NacionalidadReal = 'Nacional';
	IF @NacionalidadReal IN ('INTERNACIONAL', '2') SET @NacionalidadReal = 'Internacional';

	-- Tablas Temporales para filtros de País y Fare Basis (Indexadas para máxima velocidad)
	IF @cd_FareBasis IS NOT NULL
	BEGIN
		CREATE TABLE #TempFareBasis (cd_farebasis VARCHAR(100) PRIMARY KEY);
		INSERT INTO #TempFareBasis (cd_farebasis)
		SELECT DISTINCT UPPER(LTRIM(RTRIM(codigo)))
		FROM dbo.fnSplit(@cd_FareBasis, ',', 0, 1)
		WHERE LTRIM(RTRIM(codigo)) <> '';
	END

	IF @cd_FarebasisReal IS NOT NULL
	BEGIN
		CREATE TABLE #TempFarebasisReal (cd_farebasis VARCHAR(100) PRIMARY KEY);
		INSERT INTO #TempFarebasisReal (cd_farebasis)
		SELECT DISTINCT UPPER(LTRIM(RTRIM(codigo)))
		FROM dbo.fnSplit(@cd_FarebasisReal, ',', 0, 1)
		WHERE LTRIM(RTRIM(codigo)) <> '';
	END

	IF @cd_PaisOrigen IS NOT NULL
	BEGIN
		CREATE TABLE #TempIataOrigen (cd_Iata VARCHAR(10) PRIMARY KEY);
		INSERT INTO #TempIataOrigen (cd_Iata)
		SELECT DISTINCT UPPER(LTRIM(RTRIM(c.cd_Iata)))
		FROM dbo.Ciudades c WITH(NOLOCK)
		INNER JOIN dbo.Paises p WITH(NOLOCK) ON p.id = c.id_paises
		WHERE c.cd_Iata IS NOT NULL AND LTRIM(RTRIM(c.cd_Iata)) <> ''
		  AND (
			  p.cd_codigo IN (SELECT UPPER(LTRIM(RTRIM(codigo))) FROM dbo.fnSplit(@cd_PaisOrigen, ',', 0, 1))
			  OR UPPER(LTRIM(RTRIM(p.ds_nombre))) IN (SELECT UPPER(LTRIM(RTRIM(codigo))) FROM dbo.fnSplit(@cd_PaisOrigen, ',', 0, 1))
			  OR (ISNUMERIC(REPLACE(@cd_PaisOrigen, ',', '')) = 1 AND p.id IN (SELECT CONVERT(INT, codigo) FROM dbo.fnSplit(@cd_PaisOrigen, ',', 0, 1) WHERE ISNUMERIC(codigo) = 1))
		  );
	END

	IF @cd_PaisDestino IS NOT NULL
	BEGIN
		CREATE TABLE #TempIataDestino (cd_Iata VARCHAR(10) PRIMARY KEY);
		INSERT INTO #TempIataDestino (cd_Iata)
		SELECT DISTINCT UPPER(LTRIM(RTRIM(c.cd_Iata)))
		FROM dbo.Ciudades c WITH(NOLOCK)
		INNER JOIN dbo.Paises p WITH(NOLOCK) ON p.id = c.id_paises
		WHERE c.cd_Iata IS NOT NULL AND LTRIM(RTRIM(c.cd_Iata)) <> ''
		  AND (
			  p.cd_codigo IN (SELECT UPPER(LTRIM(RTRIM(codigo))) FROM dbo.fnSplit(@cd_PaisDestino, ',', 0, 1))
			  OR UPPER(LTRIM(RTRIM(p.ds_nombre))) IN (SELECT UPPER(LTRIM(RTRIM(codigo))) FROM dbo.fnSplit(@cd_PaisDestino, ',', 0, 1))
			  OR (ISNUMERIC(REPLACE(@cd_PaisDestino, ',', '')) = 1 AND p.id IN (SELECT CONVERT(INT, codigo) FROM dbo.fnSplit(@cd_PaisDestino, ',', 0, 1) WHERE ISNUMERIC(codigo) = 1))
		  );
	END

	IF @cd_PaisItinerario IS NOT NULL
	BEGIN
		CREATE TABLE #TempIataItinerario (cd_Iata VARCHAR(10) PRIMARY KEY);
		INSERT INTO #TempIataItinerario (cd_Iata)
		SELECT DISTINCT UPPER(LTRIM(RTRIM(c.cd_Iata)))
		FROM dbo.Ciudades c WITH(NOLOCK)
		INNER JOIN dbo.Paises p WITH(NOLOCK) ON p.id = c.id_paises
		WHERE c.cd_Iata IS NOT NULL AND LTRIM(RTRIM(c.cd_Iata)) <> ''
		  AND (
			  p.cd_codigo IN (SELECT UPPER(LTRIM(RTRIM(codigo))) FROM dbo.fnSplit(@cd_PaisItinerario, ',', 0, 1))
			  OR UPPER(LTRIM(RTRIM(p.ds_nombre))) IN (SELECT UPPER(LTRIM(RTRIM(codigo))) FROM dbo.fnSplit(@cd_PaisItinerario, ',', 0, 1))
			  OR (ISNUMERIC(REPLACE(@cd_PaisItinerario, ',', '')) = 1 AND p.id IN (SELECT CONVERT(INT, codigo) FROM dbo.fnSplit(@cd_PaisItinerario, ',', 0, 1) WHERE ISNUMERIC(codigo) = 1))
		  );
	END

	-- Tablas Temporales indexadas para cálculo dinámico y filtro de Nacionalidad Real
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

	-- Procesamiento optimizado de Filtro Tipos de Documento
	DECLARE @id_TiposDocumentoFiltro VARCHAR(8000) = ''

	IF ISNULL(@id_TiposDocumento, '') <> ''
	BEGIN
		SELECT @id_TiposDocumentoFiltro = @id_TiposDocumentoFiltro + CONVERT(VARCHAR, TD.id) + ','
		FROM dbo.TiposDocumento TD
		WHERE CONVERT(VARCHAR, TD.id) IN (SELECT LTRIM(RTRIM(codigo)) FROM dbo.fnSplit(@id_TiposDocumento, ',', 0, 1))
		   OR TD.cd_codigo IN (SELECT LTRIM(RTRIM(codigo)) FROM dbo.fnSplit(@id_TiposDocumento, ',', 0, 1))
	END

	IF ISNULL(@cd_TipoDocumento, '') <> ''
	BEGIN
		SELECT @id_TiposDocumentoFiltro = @id_TiposDocumentoFiltro + CONVERT(VARCHAR, TD.id) + ','
		FROM dbo.TiposDocumento TD
		WHERE TD.cd_codigo IN (SELECT LTRIM(RTRIM(codigo)) FROM dbo.fnSplit(@cd_TipoDocumento, ',', 0, 1))
		   OR CONVERT(VARCHAR, TD.id) IN (SELECT LTRIM(RTRIM(codigo)) FROM dbo.fnSplit(@cd_TipoDocumento, ',', 0, 1))
		   OR TD.ds_nombre IN (SELECT LTRIM(RTRIM(codigo)) FROM dbo.fnSplit(@cd_TipoDocumento, ',', 0, 1))
	END

	IF @id_TiposDocumentoFiltro = ''
		SET @id_TiposDocumentoFiltro = NULL

	--Conceptos adicionales
	INSERT INTO @TableimpretAdicional(id_ImpRet,cd_ImpRet,ds_ImpRet)
	SELECT id_ImpRet=I.id,cd_ImpRet=I.cd_codigo,ds_ImpRet=I.ds_nombre
	FROM dbo.ImpRet I
	INNER JOIN dbo.fnSplit(@ds_impretAdicional,',',0,1) IR ON IR.Codigo = I.cd_codigo 	 

	INSERT INTO @TablecargosdescAdicional(id_CargosDesc,cd_CargosDesc,ds_CargosDesc)
	SELECT id_CargosDesc=C.id,cd_CargosDesc=C.cd_codigo,ds_CargosDesc=C.ds_nombre
	FROM dbo.CargosDesc C
	INNER JOIN dbo.fnSplit(@ds_cargosdescAdicional,',',0,1) CD ON CD.Codigo = C.cd_codigo 

	INSERT INTO @TableconceptosAdicional(id_ConceptoFac,cd_ConceptoFac,ds_ConceptoFac,id_TipoConceptoFac,id_CargoDesc,cd_CargoDesc,ds_CargoDesc,id_ImpRet,cd_ImpRet,ds_ImpRet)
	SELECT id_ConceptoFac,cd_ConceptoFac,ds_ConceptoFac,id_TipoConceptoFac,id_CargoDesc,cd_CargoDesc,ds_CargoDesc,id_ImpRet,cd_ImpRet,ds_ImpRet
	FROM(
		SELECT id_ConceptoFac=CF.id,cd_ConceptoFac=CF.cd_codigo,ds_ConceptoFac=CF.ds_nombre,id_TipoConceptoFac=CF.id_TiposConceptoFacturacion,id_CargoDesc=CD.id_CargosDesc,cd_CargoDesc=CD.cd_CargosDesc,ds_CargoDesc=CD.ds_CargosDesc,id_ImpRet=NULL,cd_ImpRet=NULL,ds_ImpRet=NULL
		FROM dbo.ConceptoFacturacion CF 
		INNER JOIN dbo.fnSplit(@ds_conceptosAdicional,',',0,1) CA ON CA.Codigo = CF.cd_codigo
		OUTER APPLY @TablecargosdescAdicional AS CD
	
		UNION ALL 
	
		SELECT id_ConceptoFac=CF.id,cd_ConceptoFac=CF.cd_codigo,ds_ConceptoFac=CF.ds_nombre,id_TipoConceptoFac=CF.id_TiposConceptoFacturacion,id_CargoDesc=NULL,cd_CargoDesc=NULL,ds_CargoDesc=NULL,IR.id_ImpRet,IR.cd_ImpRet,IR.ds_ImpRet
		FROM dbo.ConceptoFacturacion CF 
		INNER JOIN dbo.fnSplit(@ds_conceptosAdicional,',',0,1) CA ON CA.Codigo = CF.cd_codigo
		OUTER APPLY @TableimpretAdicional AS IR    
	) CF
	ORDER BY id_ConceptoFac,id_ImpRet,id_CargoDesc

	--Conceptos unificados
	INSERT INTO @Tableconceptosunificados(id_ConceptoFac,cd_ConceptoFac,ds_ConceptoFac,id_TipoConceptoFac)
	SELECT CF.id,CF.cd_codigo,CF.ds_nombre,CF.id_TiposConceptoFacturacion
	FROM dbo.ConceptoFacturacion CF 
	INNER JOIN dbo.fnSplit(@ds_conceptosunificados,',',0,1) CA ON CA.Codigo = CF.cd_codigo 

	SET @id_Concepto_facturacion=''
	IF ISNULL(@cd_ConceptoFacturacion,'') <> '' 
	BEGIN
		SELECT @id_Concepto_facturacion=@id_Concepto_facturacion+CONVERT(VARCHAR,CF.id) +','
		FROM ConceptoFacturacion CF 
		WHERE CF.cd_codigo IN (SELECT codigo FROM dbo.fnSplit(@cd_ConceptoFacturacion,',',0,1))
			 AND CF.id NOT IN(SELECT id_ConceptoFac FROM @TableconceptosAdicional) 
	END

	IF @SoloConceptosVenta = 'SI' 
	BEGIN
		SET @id_Concepto_facturacion = ''
		SELECT @id_Concepto_facturacion=@id_Concepto_facturacion+ convert(VARCHAR,CF.id) +','
		FROM ConceptoFacturacion CF 
		WHERE CF.bl_RepresentaVentasAgencia = 1
			  AND CF.id NOT IN(SELECT id_ConceptoFac FROM @TableconceptosAdicional) 
	END  

	IF @cd_cliente = ''
		SET @cd_cliente = NULL;

	SELECT @cd_sucursal=replace(@cd_sucursal,CHAR(10) ,'')
	SELECT @cd_implante=replace(@cd_implante,CHAR(10) ,'')
	SELECT @cd_sucursal=replace(@cd_sucursal,CHAR(13) ,'')
	SELECT @cd_implante=replace(@cd_implante,CHAR(13) ,'')

	SET @Id_Implantes=''

	IF @cd_implante = '' OR @cd_implante = '0'
		SET @Id_Implantes = NULL;
	ELSE if @cd_implante='TODOS'
	BEGIN
		SET @Id_Implantes = ''
		SELECT @Id_Implantes=@Id_Implantes+CONVERT(VARCHAR,I.id)+','
		FROM dbo.Implantes I
		inner join Sucursales S on S.id = I.id_sucursal
		WHERE s.cd_codigo in (SELECT codigo FROM dbo.fnSplit(@cd_sucursal,',',0,1))
	END
	ELSE 
	BEGIN
		SELECT @Id_Implantes=@Id_Implantes+CONVERT(VARCHAR,id)+',' 
		FROM dbo.Implantes 
		WHERE cd_codigo IN (SELECT codigo FROM dbo.fnSplit(@cd_implante,',',0,1)) 
	END
	
	IF @Grupo_Empresarial = ''
		SET @Grupo_Empresarial = NULL;

	IF @cd_Tercero = ''
		SET @cd_Tercero = NULL;

	SET @Id_Sucursales=''
	IF @cd_sucursal = ''
		SET @Id_Sucursales = NULL;
	ELSE
	BEGIN
		SELECT @Id_Sucursales=@Id_Sucursales + CONVERT(VARCHAR,id)+',' 
		FROM Sucursales 
		WHERE cd_codigo IN (SELECT codigo FROM dbo.fnSplit(@cd_sucursal,',',0,1))
	END

	IF @cd_vendedor = ''
		SET @cd_vendedor = NULL;

	IF @id_Concepto_facturacion = ''
		SET @id_Concepto_facturacion = NULL;

	set @id_Tiqueteador=''
	IF @cd_Tiqueteador = ''
		SET @cd_Tiqueteador = NULL;
	ELSE
	BEGIN
		SELECT @id_Tiqueteador= @id_Tiqueteador+convert(varchar,ID)+',' 
		FROM Tiqueteadores 
		WHERE cd_codigo IN  (SELECT codigo FROM dbo.fnSplit(@cd_Tiqueteador,',',0,1))
	END 
	
	IF @id_Tiqueteador = ''
		SET @id_Tiqueteador = NULL;

	IF @cd_tipoCliente = ''
		SET @cd_tipoCliente = NULL;

	IF @cd_proveedor	 = ''
		SET @cd_proveedor	 = NULL;

	IF @id_Segmento = ''
		SET @id_Segmento = NULL;

	SET @Id_EtapasCotizacion = ''
	IF ISNULL(@ds_EtapasCotizacion, '') <> ''
	BEGIN
		SELECT @Id_EtapasCotizacion = @Id_EtapasCotizacion + convert(VARCHAR,e.id) + ','
		FROM dbo.fnSplit(@ds_EtapasCotizacion,',',0,1) f
		INNER JOIN Etapas e ON e.cd_codigo = f.codigo
	END

	SET @Id_TiposVenta = ''
	IF ISNULL(@ds_tipoventa, '') <> ''
	BEGIN
		SELECT @Id_TiposVenta = @Id_TiposVenta + convert(VARCHAR,t.id) + ','
		FROM dbo.fnSplit(@ds_tipoventa,',',0,1) f
		INNER JOIN TipoVenta t ON t.cd_codigo = f.codigo
	END

	IF @ds_variables <> ''
	BEGIN
		INSERT INTO @TableVariables
		SELECT codigo FROM dbo.fnSplit(@ds_variables,',',0,1)
	END

	SELECT @ds_variables=''
	SELECT @ds_variables = @ds_variables + ds_variables from(
	SELECT 
		ds_variables  = ',[dbo].[fnza_GetVariableMaestro] (case when ITEM IN (''TIQUETE'',''TAO'',''Servicio'') AND Documento IS NOT NULL AND id_TiposConceptFac<>2 then ''Tiquetes'' when ITEM=''Servicio'' then ''FacturacionServicios'' else ''CotizacionServicios'' end ,''' + variable + ''', CASE WHEN ITEM IN(''Servicio'',''CotizacionServicios'') AND (Documento IS NULL OR id_TiposConceptFac=2) THEN cd_Consecutivo_VariablesAdicionales ELSE Documento END) as '''+variable +''''+ char(13)
	FROM @TableVariables
	) AS C

	IF @ds_TipoProveedores <> ''
	BEGIN
		INSERT INTO @TableProveedores
		SELECT codigo FROM dbo.fnSplit(@ds_TipoProveedores,',',0,1)
	END
	SELECT @ds_TipoProveedores=''
	SELECT @ds_TipoProveedores = @ds_TipoProveedores + ds_Proveedores from(
	SELECT 
		ds_Proveedores  = ', CASE WHEN ITEM=''Servicio'' THEN [dbo].[fnza_GetTipoProveedorServicio] (''' + TipoProveedor + ''', id_item) 
							      WHEN ITEM=''CotizacionServicios'' THEN [dbo].[fnza_GetTipoProveedorCotizacionServicio] (''' + TipoProveedor + ''', id_item) 
							ELSE '''' END AS '''+TipoProveedor +''''+ char(13)
	FROM @TableProveedores
	) AS C
	
	---- Conceptos Unificados
	SET @ds_conceptosUnificadosFac =''
	SET @ds_conceptosUnificadosRem =''
	SET @ds_conceptosUnificadosCot =''
	SET @ds_conceptosUnificadosAux =''
	SET @ds_conceptosUnificadosAux2=''
	SET @ds_conceptosUnificadosAuxUSD = ''
	IF @ds_conceptosunificados <> '' 
	BEGIN
		--Factura
		SELECT @ds_conceptosUnificadosFac = @ds_conceptosUnificadosFac + 
		',TarifaUnificada = ' + ' CASE	WHEN F.in_TipoItem=1 THEN dbo.fnza_Get_ValorCargoImpConceptoFacUnificado(F.id,NULL,'''+@ds_conceptosunificados+''',1,0,0'+',F.Documento) 
										WHEN F.in_TipoItem=3 THEN dbo.fnza_Get_ValorCargoImpConceptoFacSrvUnificado(F.id,NULL,'''+@ds_conceptosunificados+''',1,0,0'+',F.id_item) 
										ELSE 0 END' + CHAR(13) + 
		',IVAUnificado = '   + ' CASE	WHEN F.in_TipoItem=1 THEN dbo.fnza_Get_ValorCargoImpConceptoFacUnificado(F.id,NULL,'''+@ds_conceptosunificados+''',0,1,0'+',F.Documento) 
										WHEN F.in_TipoItem=3 THEN dbo.fnza_Get_ValorCargoImpConceptoFacSrvUnificado(F.id,NULL,'''+@ds_conceptosunificados+''',0,1,0'+',F.id_item) 
										ELSE 0 END' + CHAR(13)	+ 
		',OtroUnificado = ' + ' CASE	WHEN F.in_TipoItem=1 THEN dbo.fnza_Get_ValorCargoImpConceptoFacUnificado(F.id,NULL,'''+@ds_conceptosunificados+''',0,0,1'+',F.Documento) 
										WHEN F.in_TipoItem=3 THEN dbo.fnza_Get_ValorCargoImpConceptoFacSrvUnificado(F.id,NULL,'''+@ds_conceptosunificados+''',0,0,1'+',F.id_item) 
										ELSE 0 END' + CHAR(13) 
	 
		--Remision
		SELECT @ds_conceptosUnificadosRem = @ds_conceptosUnificadosRem + 
		',TarifaUnificada = ' + ' CASE	WHEN F.in_TipoItem=1 THEN dbo.fnza_Get_ValorCargoImpConceptoFacUnificado(NULL,F.id,'''+@ds_conceptosunificados+''',1,0,0'+',F.Documento) 
										WHEN F.in_TipoItem=3 THEN dbo.fnza_Get_ValorCargoImpConceptoFacSrvUnificado(NULL,F.id,'''+@ds_conceptosunificados+''',1,0,0'+',F.id_item) 
										ELSE 0 END' + CHAR(13) + 
		',IVAUnificado = '   + ' CASE	WHEN F.in_TipoItem=1 THEN dbo.fnza_Get_ValorCargoImpConceptoFacUnificado(NULL,F.id,'''+@ds_conceptosunificados+''',0,1,0'+',F.Documento) 
										WHEN F.in_TipoItem=3 THEN dbo.fnza_Get_ValorCargoImpConceptoFacSrvUnificado(NULL,F.id,'''+@ds_conceptosunificados+''',0,1,0'+',F.id_item) 
										ELSE 0 END' + CHAR(13) + 
		',OtroUnificado = ' + ' CASE	WHEN F.in_TipoItem=1 THEN dbo.fnza_Get_ValorCargoImpConceptoFacUnificado(NULL,F.id,'''+@ds_conceptosunificados+''',0,0,1'+',F.Documento) 
										WHEN F.in_TipoItem=3 THEN dbo.fnza_Get_ValorCargoImpConceptoFacSrvUnificado(NULL,F.id,'''+@ds_conceptosunificados+''',0,0,1'+',F.id_item) 
										ELSE 0 END' + CHAR(13) 
	
		Select  @ds_conceptosUnificadosCot =',TarifaUnificada=0,IVAUnificado=0,OtroUnificado=0'
		Set @ds_conceptosUnificadosAux = Case When ISNULL(@ds_conceptosunificados,'') <> '' THEN ',TarifaUnificada,IVAUnificado,OtroUnificado' ELSE '' END
		
		Select @ds_conceptosUnificadosAuxUSD = @ds_conceptosUnificadosAuxUSD + ','+Codigo + '_USD=[' + Codigo + ']/ Case When am_tcambio <> 1 Then am_tcambio Else Tasa End' +char(13)
		From(
			Select codigo from dbo.fnSplit_table(@ds_conceptosUnificadosAux,',','',0) Where codigo<>''
		) As c
	END
	
	---- Conceptos adicionales
	SET @ds_conceptosAdicionalFac=''
	SET @ds_conceptosAdicionalRem=''
	SET @ds_conceptosAdicionalAux=''
	SET @ds_conceptosAdicionalAuxUSD=''
	SET @ds_conceptosAdicionalAux2=''
	SET @ds_conceptosAdicionalAux2USD=''

	--Factura
	SELECT @ds_conceptosAdicionalFac=@ds_conceptosAdicionalFac + 
									CASE WHEN ISNULL(cd_CargoDesc,'')<>'' or ISNULL(cd_ImpRet,'')<>'' THEN 
										',[' + cd_ConceptoFac+CASE WHEN ISNULL(cd_CargoDesc,'')<>'' THEN '_'+cd_CargoDesc+']' 
											WHEN ISNULL(cd_ImpRet,'')<>'' THEN '_'+cd_ImpRet +']'
											ELSE '' END + '= CASE WHEN F.in_TipoItem=1 THEN dbo.fnza_Get_ValorCargoImpConceptoFac(F.id,NULL,NULL,'''+cd_ConceptoFac+''','+ISNULL(CONVERT(VARCHAR(18),id_CargoDesc),'NULL')+','+ISNULL(CONVERT(VARCHAR(18),id_ImpRet),'NULL')+',F.Documento) 
																WHEN F.in_TipoItem=3 THEN dbo.fnza_Get_ValorCargoImpConceptoFacSrv(F.id,NULL,NULL,'''+cd_ConceptoFac+''','+ISNULL(CONVERT(VARCHAR(18),id_CargoDesc),'NULL')+','+ISNULL(CONVERT(VARCHAR(18),id_ImpRet),'NULL')+',NULL,F.id_item) 
																ELSE 0 END' + CHAR(13)
									ELSE '' END																								 	 																							 							
	FROM @TableconceptosAdicional

	--Remision	
	SELECT @ds_conceptosAdicionalRem=@ds_conceptosAdicionalRem+
									CASE WHEN ISNULL(cd_CargoDesc,'')<>'' or ISNULL(cd_ImpRet,'')<>'' THEN 
										',[' + cd_ConceptoFac+CASE WHEN ISNULL(cd_CargoDesc,'')<>'' THEN '_'+cd_CargoDesc+']' 
											WHEN ISNULL(cd_ImpRet,'')<>'' THEN '_'+cd_ImpRet +']'
											ELSE '' END + '= CASE	WHEN F.in_TipoItem=1 THEN dbo.fnza_Get_ValorCargoImpConceptoFac(NULL,F.id,NULL,'''+cd_ConceptoFac+''','+ISNULL(CONVERT(VARCHAR(18),id_CargoDesc),'NULL')+','+ISNULL(CONVERT(VARCHAR(18),id_ImpRet),'NULL')+',F.Documento) 
															WHEN F.in_TipoItem=3 THEN dbo.fnza_Get_ValorCargoImpConceptoFacSrv(NULL,F.id,NULL,'''+cd_ConceptoFac+''','+ISNULL(CONVERT(VARCHAR(18),id_CargoDesc),'NULL')+','+ISNULL(CONVERT(VARCHAR(18),id_ImpRet),'NULL')+',NULL,F.id_item) 
															ELSE 0 END' + CHAR(13)	
									ELSE '' END																							 	 																							 							
	FROM @TableconceptosAdicional

	--Cotizacion
	SELECT @ds_conceptosAdicionalCot=@ds_conceptosAdicionalCot+
									CASE WHEN ISNULL(cd_CargoDesc,'')<>'' or ISNULL(cd_ImpRet,'')<>'' THEN 
										',[' + cd_ConceptoFac+CASE WHEN ISNULL(cd_CargoDesc,'')<>'' THEN '_'+cd_CargoDesc +']' 
											WHEN ISNULL(cd_ImpRet,'')<>'' THEN '_'+cd_ImpRet +']'
											ELSE '' END + '= CASE WHEN CS.id_TiposConceptFac=2 THEN dbo.fnza_Get_ValorCargoImpConceptoCot(CT.id,NULL,'''+cd_ConceptoFac+''','+ISNULL(CONVERT(VARCHAR(18),id_CargoDesc),'NULL')+','+ISNULL(CONVERT(VARCHAR(18),id_ImpRet),'NULL')+',CS.cd_tiquete) ELSE 0 END' + CHAR(13)																								 	 																							 							
									ELSE '' END
	FROM @TableconceptosAdicional

	SELECT @ds_conceptosAdicionalAux=@ds_conceptosAdicionalAux+
																CASE WHEN ISNULL(cd_CargoDesc,'')<>'' or ISNULL(cd_ImpRet,'')<>'' THEN 
																',[' + cd_ConceptoFac+CASE WHEN ISNULL(cd_CargoDesc,'')<>'' THEN '_'+cd_CargoDesc WHEN ISNULL(cd_ImpRet,'')<>'' THEN '_'+cd_ImpRet ELSE '' END+']'  + CHAR(13)																							 							
																ELSE '' END
	FROM @TableconceptosAdicional
	
	SELECT @ds_conceptosAdicionalAux2=@ds_conceptosAdicionalAux2+		
																CASE WHEN ISNULL(cd_CargoDesc,'')<>'' or ISNULL(cd_ImpRet,'')<>'' THEN 
																'+[' + cd_ConceptoFac+CASE WHEN ISNULL(cd_CargoDesc,'')<>'' THEN '_'+cd_CargoDesc WHEN ISNULL(cd_ImpRet,'')<>'' THEN '_'+cd_ImpRet ELSE '' END	+']' 
																ELSE '' END
																
	FROM @TableconceptosAdicional

	Select @ds_conceptosAdicionalAuxUSD = @ds_conceptosAdicionalAuxUSD + ',['+Codigo + '_USD]=[' + Codigo + ']/ Case When am_tcambio <> 1 Then am_tcambio Else Tasa End' +char(13)
	From(
	Select codigo=replace(replace(replace(codigo,'[',''),']',''),char(13),'')from dbo.fnSplit_table(@ds_conceptosAdicionalAux,',','',0)
	Where codigo<>'') As c

	Select @ds_conceptosAdicionalAux2USD = Replace(@ds_conceptosAdicionalAux2,']','_USD]')

	IF @ds_Categorias <> ''
	BEGIN
		INSERT INTO @TableCategorias
		SELECT C.id, C.cd_codigo
		FROM dbo.Categorias C
		INNER JOIN dbo.fnSplit(@ds_Categorias,',',0,1) CC ON CC.Codigo = C.cd_codigo  
	END

	SELECT @ds_Categorias=''
	SELECT @ds_Categorias = @ds_Categorias + ds_categorias from(
	SELECT 
		ds_categorias  = ',Categoria_'+ REPLACE(cd_Categoria,' ','')+'=CASE WHEN Tipo=''CT'' THEN dbo.fnza_Get_CotizacionItemsCategorias(id,iditems,'+CONVERT(VARCHAR(18),id_Categoria)+') WHEN Tipo=''FA'' THEN dbo.fnza_Get_FacturaItemsCategorias(id,null,iditems,'+CONVERT(VARCHAR(18),id_Categoria)+') ELSE dbo.fnza_Get_FacturaItemsCategorias(NULL,id,iditems,'+CONVERT(VARCHAR(18),id_Categoria)+') END ' + char(13)
	FROM @TableCategorias
	) AS C

	-- Filtros de Fecha de Salida y Llegada (Solo Año Mes Día) optimizados (sargable)
	DECLARE @FiltroFechasVueloSQL VARCHAR(MAX) = ''
	DECLARE @FiltroFechasVueloCotSQL VARCHAR(MAX) = ''

	IF @fecha_salida_inicio IS NOT NULL OR @fecha_salida_fin IS NOT NULL
	BEGIN
		IF @fecha_salida_inicio IS NOT NULL AND @fecha_salida_fin IS NOT NULL
		BEGIN
			SET @FiltroFechasVueloSQL = @FiltroFechasVueloSQL + ' AND (F.dt_salida >= ''' + CONVERT(VARCHAR(10), @fecha_salida_inicio, 120) + ' 00:00:00'' AND F.dt_salida < ''' + CONVERT(VARCHAR(10), DATEADD(DAY, 1, @fecha_salida_fin), 120) + ' 00:00:00'')'
			SET @FiltroFechasVueloCotSQL = @FiltroFechasVueloCotSQL + ' AND (cs.dt_salida >= ''' + CONVERT(VARCHAR(10), @fecha_salida_inicio, 120) + ' 00:00:00'' AND cs.dt_salida < ''' + CONVERT(VARCHAR(10), DATEADD(DAY, 1, @fecha_salida_fin), 120) + ' 00:00:00'')'
		END
		ELSE IF @fecha_salida_inicio IS NOT NULL
		BEGIN
			SET @FiltroFechasVueloSQL = @FiltroFechasVueloSQL + ' AND (F.dt_salida >= ''' + CONVERT(VARCHAR(10), @fecha_salida_inicio, 120) + ' 00:00:00'')'
			SET @FiltroFechasVueloCotSQL = @FiltroFechasVueloCotSQL + ' AND (cs.dt_salida >= ''' + CONVERT(VARCHAR(10), @fecha_salida_inicio, 120) + ' 00:00:00'')'
		END
		ELSE
		BEGIN
			SET @FiltroFechasVueloSQL = @FiltroFechasVueloSQL + ' AND (F.dt_salida < ''' + CONVERT(VARCHAR(10), DATEADD(DAY, 1, @fecha_salida_fin), 120) + ' 00:00:00'')'
			SET @FiltroFechasVueloCotSQL = @FiltroFechasVueloCotSQL + ' AND (cs.dt_salida < ''' + CONVERT(VARCHAR(10), DATEADD(DAY, 1, @fecha_salida_fin), 120) + ' 00:00:00'')'
		END
	END

	IF @fecha_llegada_inicio IS NOT NULL OR @fecha_llegada_fin IS NOT NULL
	BEGIN
		IF @fecha_llegada_inicio IS NOT NULL AND @fecha_llegada_fin IS NOT NULL
		BEGIN
			SET @FiltroFechasVueloSQL = @FiltroFechasVueloSQL + ' AND (F.dt_llegada >= ''' + CONVERT(VARCHAR(10), @fecha_llegada_inicio, 120) + ' 00:00:00'' AND F.dt_llegada < ''' + CONVERT(VARCHAR(10), DATEADD(DAY, 1, @fecha_llegada_fin), 120) + ' 00:00:00'')'
			SET @FiltroFechasVueloCotSQL = @FiltroFechasVueloCotSQL + ' AND (cs.dt_llegada >= ''' + CONVERT(VARCHAR(10), @fecha_llegada_inicio, 120) + ' 00:00:00'' AND cs.dt_llegada < ''' + CONVERT(VARCHAR(10), DATEADD(DAY, 1, @fecha_llegada_fin), 120) + ' 00:00:00'')'
		END
		ELSE IF @fecha_llegada_inicio IS NOT NULL
		BEGIN
			SET @FiltroFechasVueloSQL = @FiltroFechasVueloSQL + ' AND (F.dt_llegada >= ''' + CONVERT(VARCHAR(10), @fecha_llegada_inicio, 120) + ' 00:00:00'')'
			SET @FiltroFechasVueloCotSQL = @FiltroFechasVueloCotSQL + ' AND (cs.dt_llegada >= ''' + CONVERT(VARCHAR(10), @fecha_llegada_inicio, 120) + ' 00:00:00'')'
		END
		ELSE
		BEGIN
			SET @FiltroFechasVueloSQL = @FiltroFechasVueloSQL + ' AND (F.dt_llegada < ''' + CONVERT(VARCHAR(10), DATEADD(DAY, 1, @fecha_llegada_fin), 120) + ' 00:00:00'')'
			SET @FiltroFechasVueloCotSQL = @FiltroFechasVueloCotSQL + ' AND (cs.dt_llegada < ''' + CONVERT(VARCHAR(10), DATEADD(DAY, 1, @fecha_llegada_fin), 120) + ' 00:00:00'')'
		END
	END

	-- Filtros de Ruta / Itinerario generados dinámicamente
	DECLARE @FiltroRutaSQL VARCHAR(MAX) = ''
	
	-- 1. Ciudad Origen (Primera ciudad antes del primer '/')
	IF @cd_CiudadOrigen IS NOT NULL
	BEGIN
		SET @FiltroRutaSQL = @FiltroRutaSQL + '
		AND (
			(F.Servicio IS NOT NULL AND F.Servicio <> '''' AND UPPER(
				CASE WHEN CHARINDEX(''/'', LTRIM(RTRIM(F.Servicio))) > 0 
					 THEN SUBSTRING(LTRIM(RTRIM(F.Servicio)), 1, CHARINDEX(''/'', LTRIM(RTRIM(F.Servicio))) - 1)
					 ELSE LTRIM(RTRIM(F.Servicio)) END
			) IN (SELECT UPPER(LTRIM(RTRIM(codigo))) FROM dbo.fnSplit(''' + @cd_CiudadOrigen + ''', '','', 0, 1)))
		)'
	END

	-- 2. Segunda Ciudad (Ciudad entre el primer y segundo '/')
	IF @cd_SegundaCiudad IS NOT NULL
	BEGIN
		SET @FiltroRutaSQL = @FiltroRutaSQL + '
		AND (
			(F.Servicio IS NOT NULL AND F.Servicio <> '''' AND UPPER(
				CASE WHEN CHARINDEX(''/'', LTRIM(RTRIM(F.Servicio))) > 0 
					 THEN CASE WHEN CHARINDEX(''/'', LTRIM(RTRIM(F.Servicio)), CHARINDEX(''/'', LTRIM(RTRIM(F.Servicio))) + 1) > 0
							   THEN SUBSTRING(LTRIM(RTRIM(F.Servicio)), CHARINDEX(''/'', LTRIM(RTRIM(F.Servicio))) + 1, CHARINDEX(''/'', LTRIM(RTRIM(F.Servicio)), CHARINDEX(''/'', LTRIM(RTRIM(F.Servicio))) + 1) - CHARINDEX(''/'', LTRIM(RTRIM(F.Servicio))) - 1)
							   ELSE SUBSTRING(LTRIM(RTRIM(F.Servicio)), CHARINDEX(''/'', LTRIM(RTRIM(F.Servicio))) + 1, 50) END
					 ELSE '''' END
			) IN (SELECT UPPER(LTRIM(RTRIM(codigo))) FROM dbo.fnSplit(''' + @cd_SegundaCiudad + ''', '','', 0, 1)))
		)'
	END

	-- 3. Ciudad en cualquier parte del Itinerario
	IF @cd_CiudadItinerario IS NOT NULL
	BEGIN
		SET @FiltroRutaSQL = @FiltroRutaSQL + '
		AND (
			(F.Servicio IS NOT NULL AND F.Servicio <> '''' AND EXISTS (
				SELECT 1 FROM dbo.fnSplit(''' + @cd_CiudadItinerario + ''', '','', 0, 1) s
				WHERE ''/'' + UPPER(LTRIM(RTRIM(F.Servicio))) + ''/'' LIKE ''%/'' + UPPER(LTRIM(RTRIM(s.codigo))) + ''/%''
			))
		)'
	END

	-- 4. País Origen (País de la primera ciudad antes del primer '/')
	IF @cd_PaisOrigen IS NOT NULL
	BEGIN
		SET @FiltroRutaSQL = @FiltroRutaSQL + '
		AND (
			(F.Servicio IS NOT NULL AND F.Servicio <> '''' AND UPPER(
				CASE WHEN CHARINDEX(''/'', LTRIM(RTRIM(F.Servicio))) > 0 
					 THEN SUBSTRING(LTRIM(RTRIM(F.Servicio)), 1, CHARINDEX(''/'', LTRIM(RTRIM(F.Servicio))) - 1)
					 ELSE LTRIM(RTRIM(F.Servicio)) END
			) IN (SELECT cd_Iata FROM #TempIataOrigen))
		)'
	END

	-- 5. País Destino (País de la última ciudad después del último '/')
	IF @cd_PaisDestino IS NOT NULL
	BEGIN
		SET @FiltroRutaSQL = @FiltroRutaSQL + '
		AND (
			(F.Servicio IS NOT NULL AND F.Servicio <> '''' AND UPPER(
				CASE WHEN CHARINDEX(''/'', LTRIM(RTRIM(F.Servicio))) > 0 
					 THEN REVERSE(SUBSTRING(REVERSE(LTRIM(RTRIM(F.Servicio))), 1, CHARINDEX(''/'', REVERSE(LTRIM(RTRIM(F.Servicio)))) - 1))
					 ELSE LTRIM(RTRIM(F.Servicio)) END
			) IN (SELECT cd_Iata FROM #TempIataDestino))
		)'
	END

	-- 6. País en cualquier parte del Itinerario
	IF @cd_PaisItinerario IS NOT NULL
	BEGIN
		SET @FiltroRutaSQL = @FiltroRutaSQL + '
		AND (
			(F.Servicio IS NOT NULL AND F.Servicio <> '''' AND EXISTS (
				SELECT 1 FROM #TempIataItinerario pItin
				WHERE ''/'' + UPPER(LTRIM(RTRIM(F.Servicio))) + ''/'' LIKE ''%/'' + pItin.cd_Iata + ''/%''
			))
		)'
	END

	-- Filtro Fare Basis (Búsqueda ultrarrápida indexada en Tiquetes_Itinerarios)
	DECLARE @FiltroFareBasisSQL VARCHAR(MAX) = ''
	IF @cd_FareBasis IS NOT NULL
	BEGIN
		SET @FiltroFareBasisSQL = '
		AND (
			tkt.id IS NOT NULL AND EXISTS (
				SELECT 1 FROM dbo.Tiquetes_Itinerarios tiFB WITH(NOLOCK)
				WHERE tiFB.id_Tiquetes = tkt.id 
				  AND EXISTS (
					  SELECT 1 FROM #TempFareBasis fbFiltro
					  WHERE UPPER(LTRIM(RTRIM(tiFB.cd_farebasis))) LIKE ''%'' + fbFiltro.cd_farebasis + ''%''
				  )
			)
		)'
	END

	-- Filtro Revisados (Tiquetes revisados con cd_tktrevisado)
	DECLARE @FiltroRevisadosSQL VARCHAR(MAX) = ''
	IF @MostrarSoloRevisados = 'SI'
	BEGIN
		SET @FiltroRevisadosSQL = ' AND (F.cd_tktrevisado IS NOT NULL AND LTRIM(RTRIM(F.cd_tktrevisado)) <> '''')'
	END
	ELSE IF @MostrarSoloRevisados = 'NO'
	BEGIN
		SET @FiltroRevisadosSQL = ' AND (F.cd_tktrevisado IS NULL OR LTRIM(RTRIM(F.cd_tktrevisado)) = '''')'
	END

	-- Filtro Nacionalidad Real (Evaluación dinámica basada en ciudades de la ruta vs tablas maestras)
	DECLARE @FiltroNacionalidadRealOuterSQL VARCHAR(MAX) = ''
	IF @NacionalidadReal = 'Nacional'
	BEGIN
		SET @FiltroNacionalidadRealOuterSQL = '
	WHERE (
		CASE 
			WHEN Facturacion.Servicio IS NOT NULL AND CHARINDEX(''/'', REPLACE(Facturacion.Servicio, ''-'', ''/'')) > 0 AND EXISTS (
				SELECT 1 FROM #TempCiudadesExterior ext 
				WHERE ''/'' + REPLACE(REPLACE(UPPER(LTRIM(RTRIM(Facturacion.Servicio))), '' '', ''''), ''-'', ''/'') + ''/'' LIKE ''%/'' + ext.cd_Iata + ''/%''
			) THEN ''Internacional''
			WHEN Facturacion.Servicio IS NOT NULL AND CHARINDEX(''/'', REPLACE(Facturacion.Servicio, ''-'', ''/'')) > 0 
			  AND EXISTS (
				  SELECT 1 
				  FROM dbo.fnSplit(REPLACE(REPLACE(UPPER(LTRIM(RTRIM(Facturacion.Servicio))), '' '', ''''), ''-'', ''/''), ''/'', 0, 1) s
				  WHERE LTRIM(RTRIM(s.codigo)) <> ''''
			  )
			  AND NOT EXISTS (
				  SELECT 1 
				  FROM dbo.fnSplit(REPLACE(REPLACE(UPPER(LTRIM(RTRIM(Facturacion.Servicio))), '' '', ''''), ''-'', ''/''), ''/'', 0, 1) s
				  WHERE LTRIM(RTRIM(s.codigo)) <> '''' 
					AND s.codigo NOT IN (SELECT cd_Iata FROM #TempCiudadesColombia)
			  ) THEN ''Nacional''
			WHEN Facturacion.NACIONALIDAD = 1 THEN ''Nacional''
			ELSE ''Internacional''
		END = ''Nacional''
	)'
	END
	ELSE IF @NacionalidadReal = 'Internacional'
	BEGIN
		SET @FiltroNacionalidadRealOuterSQL = '
	WHERE (
		CASE 
			WHEN Facturacion.Servicio IS NOT NULL AND CHARINDEX(''/'', REPLACE(Facturacion.Servicio, ''-'', ''/'')) > 0 AND EXISTS (
				SELECT 1 FROM #TempCiudadesExterior ext 
				WHERE ''/'' + REPLACE(REPLACE(UPPER(LTRIM(RTRIM(Facturacion.Servicio))), '' '', ''''), ''-'', ''/'') + ''/'' LIKE ''%/'' + ext.cd_Iata + ''/%''
			) THEN ''Internacional''
			WHEN Facturacion.Servicio IS NOT NULL AND CHARINDEX(''/'', REPLACE(Facturacion.Servicio, ''-'', ''/'')) > 0 
			  AND EXISTS (
				  SELECT 1 
				  FROM dbo.fnSplit(REPLACE(REPLACE(UPPER(LTRIM(RTRIM(Facturacion.Servicio))), '' '', ''''), ''-'', ''/''), ''/'', 0, 1) s
				  WHERE LTRIM(RTRIM(s.codigo)) <> ''''
			  )
			  AND NOT EXISTS (
				  SELECT 1 
				  FROM dbo.fnSplit(REPLACE(REPLACE(UPPER(LTRIM(RTRIM(Facturacion.Servicio))), '' '', ''''), ''-'', ''/''), ''/'', 0, 1) s
				  WHERE LTRIM(RTRIM(s.codigo)) <> '''' 
					AND s.codigo NOT IN (SELECT cd_Iata FROM #TempCiudadesColombia)
			  ) THEN ''Nacional''
			WHEN Facturacion.NACIONALIDAD = 1 THEN ''Nacional''
			ELSE ''Internacional''
		END = ''Internacional''
	)'
	END

	-- Filtro Farebasis Real (Búsqueda sobre columna calculada FarebasisReal)
	DECLARE @FiltroFarebasisRealOuterSQL VARCHAR(MAX) = ''
	IF @cd_FarebasisReal IS NOT NULL
	BEGIN
		SET @FiltroFarebasisRealOuterSQL = '(
			Facturacion.FarebasisReal IS NOT NULL AND EXISTS (
				SELECT 1 FROM #TempFarebasisReal fbrFiltro
				WHERE UPPER(LTRIM(RTRIM(Facturacion.FarebasisReal))) LIKE ''%'' + fbrFiltro.cd_farebasis + ''%''
			)
		)'
	END

	-- Filtro Reembolsos (Mostrar solo tiquetes con reembolso o solo sin reembolso)
	DECLARE @FiltroReembolsoInnerSQL VARCHAR(MAX) = ''
	DECLARE @FiltroReembolsoOuterSQL VARCHAR(MAX) = ''
	IF @MostrarSoloReembolsos = 'SI'
	BEGIN
		SET @FiltroReembolsoInnerSQL = ' AND (tkt.id IS NOT NULL AND EXISTS (SELECT 1 FROM dbo.Reembolsos rb WITH(NOLOCK) WHERE LTRIM(RTRIM(rb.cd_tiquete)) = LTRIM(RTRIM(tkt.cd_tiquete))))'
		SET @FiltroReembolsoOuterSQL = '(Facturacion.NumeroReembolso IS NOT NULL AND LTRIM(RTRIM(Facturacion.NumeroReembolso)) <> '''')'
	END
	ELSE IF @MostrarSoloReembolsos = 'NO'
	BEGIN
		SET @FiltroReembolsoInnerSQL = ' AND (tkt.id IS NULL OR NOT EXISTS (SELECT 1 FROM dbo.Reembolsos rb WITH(NOLOCK) WHERE LTRIM(RTRIM(rb.cd_tiquete)) = LTRIM(RTRIM(tkt.cd_tiquete))))'
		SET @FiltroReembolsoOuterSQL = '(Facturacion.NumeroReembolso IS NULL OR LTRIM(RTRIM(Facturacion.NumeroReembolso)) = '''')'
	END

	DECLARE @FiltroFinalOuterSQL VARCHAR(MAX) = ''
	IF @FiltroNacionalidadRealOuterSQL <> ''
	BEGIN
		SET @FiltroFinalOuterSQL = @FiltroNacionalidadRealOuterSQL;
		IF @FiltroFarebasisRealOuterSQL <> ''
			SET @FiltroFinalOuterSQL = @FiltroFinalOuterSQL + ' AND ' + @FiltroFarebasisRealOuterSQL;
		IF @FiltroReembolsoOuterSQL <> ''
			SET @FiltroFinalOuterSQL = @FiltroFinalOuterSQL + ' AND ' + @FiltroReembolsoOuterSQL;
	END
	ELSE
	BEGIN
		DECLARE @OuterConds VARCHAR(MAX) = ''
		IF @FiltroFarebasisRealOuterSQL <> ''
			SET @OuterConds = @OuterConds + CASE WHEN @OuterConds <> '' THEN ' AND ' ELSE '' END + @FiltroFarebasisRealOuterSQL;
		IF @FiltroReembolsoOuterSQL <> ''
			SET @OuterConds = @OuterConds + CASE WHEN @OuterConds <> '' THEN ' AND ' ELSE '' END + @FiltroReembolsoOuterSQL;

		IF @OuterConds <> ''
			SET @FiltroFinalOuterSQL = ' WHERE ' + @OuterConds;
	END

	--------------------------------------------------------------------------------------------------
	-- Construcción de Consultas por Subbloques (Modular y Condicional)
	--------------------------------------------------------------------------------------------------
	DECLARE @QueryFacturas VARCHAR(MAX) = '
		SELECT 
			F.Tipo
			,F.id
			,Fuente
			,Numero
			,Fuente+Numero as ''factura''
			,dt_fechacont
			,s.cd_codigo AS ''Sucursal''
			,I.cd_codigo AS ''Implante''
			,cd_cliente
			,ds_cliente
			,f.cd_vendedor
			,v.NOMBVENDE as ''ds_vendedor''
			,ISNULL(V.Identificacion, '''') as ''Identificacion_vendedor''
			,V.telefono as ''Tel_vendedor''  
			,V.Direccion as ''Dir_vendedor''  
			,V.Email as ''Correo_vendedor''  
			,Case 
				When id_ConceptoFacturacion IN (1,2) AND id_TiposConceptFac = 1 Then ''Tiquete''
				When id_ConceptoFacturacion IN (4,5) Then ''TAO''
				Else ''Servicio''
			End AS ''Item''
			,C.ds_nombre AS ''Concepto''
			,Documento
			,isnull(TipoServicio,'''') AS TipoServicio
			,Servicio
			,Clase
			,Pasajero
			,Case 
				When id_ConceptoFacturacion IN (1,2) Then Servicio
				Else ''''
			End AS ''Ruta''
			,Case 
				When id_ConceptoFacturacion IN (1,2) Then ''Boleto Aereo No.'' + SPACE(1)
															+ Documento + SPACE(1) 
															+ Servicio + SPACE(1) 
															+ ev.cd_siglas + SPACE(1) + cd_EntVend + SPACE(1) 
															+ Pasajero
				When id_TiposConceptFac = 2 Then Servicio
				When id_TiposConceptFac in (3,4) Then C.ds_nombre
				Else ''''
			End AS ''DescripcionCompleta''
			,F.Tarifa'+CASE WHEN @in_MostrarCombustible=0 THEN '+ISNULL(F.CMBCobrado,0)' ELSE '' END + ' - CASE WHEN ISNULL(F.CMBCobrado,0)<>0 AND ISNULL(F.CMB,0)=0 THEN ISNULL(F.CMBCobrado,0) ELSE 0 END AS ''Tarifa''
			,'+CASE WHEN @in_MostrarCombustible=0 THEN '0' ELSE 'ISNULL(F.CMBCobrado,0)' END +' AS ''Combustible''
			,F.Iva
			,Otros = CASE WHEN '+convert(varchar,@Descuento)+' = 1 THEN f.OtrosDesc-F.CMB -F.TUA ELSE Otros-F.CMB-F.TUA END + CASE WHEN F.in_TipoItem = 1 THEN ISNULL(srv.am_valor,0) ELSE 0 END
			,F.TUA
			,F.Descuentos
			,Case When F.in_TipoItem = 1 THEN f.Documento ELSE CONVERT(VARCHAR,id_item) END as ''id_item''
			,f.ds_records as ''Records''
			-- OPTIMIZACION: Cálculo ultra-rápido de segmentos de ruta sin fnSplit por fila
			,CASE WHEN F.in_TipoItem = 1 THEN CASE WHEN CHARINDEX(''/'', F.Servicio) > 0 THEN LEN(F.Servicio) - LEN(REPLACE(F.Servicio, ''/'', '''')) ELSE 1 END
				WHEN (F.in_TipoItem = 2 OR F.in_TipoItem = 3) AND F.ds_records IS NOT NULL THEN 1
				ELSE 0
			END AS ''NSegmentos''
			, 1 as ''Transacciones''
			,F.Tarifa + ISNULL(f.CMBCobrado,0) - CASE WHEN ISNULL(F.CMBCobrado,0)<>0 AND ISNULL(F.CMB,0)=0 THEN ISNULL(F.CMBCobrado,0) ELSE 0 END as ''tarifa_neta''
			,F.am_blTarifa as ''VentasTotales''
			,F.dt_salida
			,F.dt_llegada
			,Revisado = F.cd_tktrevisado
			,Conjuncion = F.cd_tktconj
			,NConjuncion = F.in_numtktconj
			,CASE WHEN Rtrim(isnull(F.cd_TipoTiqueteGDS,''''))=''EMD'' THEN ''SI'' ELSE ''NO'' END AS ''Penalidad''
			,FechaExpedicion = F.dt_fechaexped
			,Nacionalidad
			,TQ.ds_nombre+'' - ''+TQ.cd_codigo AS ''Tiqueteador''	
			,cd_EntVend +'' - ''+ ds_EntVend As ''EntVendedora''
			,cd_EntDist +'' - ''+ ds_EntDist As ''EntDistribuidora''
			,F.cd_TipoTiqueteGDS
			,id_TiposDocumento = tkt.id_TiposDocumento
			,cd_TipoDocumento = ISNULL(TD.cd_codigo, '''')
			,TipoDocumento = ISNULL(TD.ds_nombre, '''')
			,CASE WHEN I.cd_codigo IS NULL THEN isnull(S.cd_codigo,'''')+'' - ''+isnull(S.ds_nombre,'''') ELSE  isnull(I.cd_codigo,'''')+'' - ''+isnull(I.ds_nombre,'''') END AS ''OficinaVenta'' 	
			,isnull(S.cd_codigo,'''')+'' - ''+isnull(S.ds_nombre,'''') AS ''OficinaFactura''	
			,TQF.ds_nombre+'' - ''+TQF.cd_codigo AS ''Facturador''
			,Proveedor = P.RAZONCIAL 
			,F.TarifaMax 
			,F.TarifaMin
			,F.CodigoAhorro
			,F.TarifaCobrada
			,F.am_desah
			,F.cencosto_interno	
			,TiqueteUtilizado = Case When F.in_TipoItem = 1 THEN Case When f.bl_noutilizado = 0 THEN ''UTILIZADO'' ELSE ''NO UTILIZADO'' END ELSE '''' END
			,Case When F.in_TipoItem = 1 THEN CASE WHEN E.bl_nogds=1 THEN ''NO'' ELSE ''SI'' END ELSE '''' END AS ''Gds''
			,CASE WHEN ISNULL(F.tasa,0)=0 THEN 1 ELSE F.tasa END AS ''tasa''
			,SEG.DESSEGMENTO as ''ClienteSegmento''
			,ISNULL(A.ds_tcvoucher,'''') as ''Voucher''
			,ISNULL(A.ds_tcautorizacion,'''') as ''Autorizacion''
			,F.Contado
			,F.Credito	
			,F.am_tcambio
			,TarjetaCredito = case when id_ConceptoFacturacion in (1,2) then dbo.fnza_TC_Items(1, id_item)
					            when id_ConceptoFacturacion in (3,4) then dbo.fnza_TC_Items(2, id_item)
								else dbo.fnza_TC_Items(3, id_item) end
			,GrEmpresarial = CASE WHEN ISNULL(CodigoGrEmpresarial,'''') <> '''' THEN GR.Nombre ELSE CL.RAZONCIAL END
			,tp.ds_nombre AS ''TipoVenta''
			,Vuelo = case when id_ConceptoFacturacion in (1,2) then 
						STUFF((
							SELECT '' - '' + RTRIM(ISNULL(ti2.cd_aero_siglas, '''')) + RTRIM(ti2.ds_NumVuelo)
							FROM (
								SELECT MIN(ti2.orden) as orden, ti2.cd_aero_siglas, ti2.ds_NumVuelo
								FROM dbo.Tiquetes_Itinerarios ti2 WITH(NOLOCK)
								WHERE ti2.id_Tiquetes = tkt.id AND ti2.ds_NumVuelo IS NOT NULL AND LTRIM(RTRIM(ti2.ds_NumVuelo)) <> ''''
								GROUP BY ti2.cd_aero_siglas, ti2.ds_NumVuelo
							) ti2
							ORDER BY ti2.orden
							FOR XML PATH('''')
						), 1, 3, '''')
					ELSE NULL END
			,Aerolinea = case when id_ConceptoFacturacion in (1,2) then 
							STUFF((
								SELECT '' - '' + RTRIM(ti2.cd_aero_siglas)
								FROM (
									SELECT DISTINCT ti2.orden, RTRIM(ti2.cd_aero_siglas) as cd_aero_siglas
									FROM dbo.Tiquetes_Itinerarios ti2 WITH(NOLOCK)
									WHERE ti2.id_Tiquetes = tkt.id 
									  AND ti2.cd_aero_siglas IS NOT NULL 
									  AND LTRIM(RTRIM(ti2.cd_aero_siglas)) <> ''''
								) ti2
								ORDER BY ti2.orden
								FOR XML PATH('''')
							), 1, 3, '''')
						ELSE NULL END
			,CombinacionAerolinea = case when id_ConceptoFacturacion in (1,2) AND tkt.id IS NOT NULL then
										case when (
											SELECT COUNT(DISTINCT tiComb.cd_aero_siglas)
											FROM dbo.Tiquetes_Itinerarios tiComb WITH(NOLOCK)
											WHERE tiComb.id_Tiquetes = tkt.id AND tiComb.cd_aero_siglas IS NOT NULL AND LTRIM(RTRIM(tiComb.cd_aero_siglas)) <> ''''
										) > 1 then ''Combinada''
										when (
											SELECT COUNT(DISTINCT tiComb.cd_aero_siglas)
											FROM dbo.Tiquetes_Itinerarios tiComb WITH(NOLOCK)
											WHERE tiComb.id_Tiquetes = tkt.id AND tiComb.cd_aero_siglas IS NOT NULL AND LTRIM(RTRIM(tiComb.cd_aero_siglas)) <> ''''
										) = 1 then ''Misma Aerolínea''
										else '''' end
									else '''' end
			,OrdenAerolinea = case when id_ConceptoFacturacion in (1,2) AND tkt.id IS NOT NULL then
								case when (
									SELECT COUNT(DISTINCT tiComb.cd_aero_siglas)
									FROM dbo.Tiquetes_Itinerarios tiComb WITH(NOLOCK)
									WHERE tiComb.id_Tiquetes = tkt.id AND tiComb.cd_aero_siglas IS NOT NULL AND LTRIM(RTRIM(tiComb.cd_aero_siglas)) <> ''''
								) = 1 then 0
								when (
									SELECT COUNT(DISTINCT tiComb.cd_aero_siglas)
									FROM dbo.Tiquetes_Itinerarios tiComb WITH(NOLOCK)
									WHERE tiComb.id_Tiquetes = tkt.id AND tiComb.cd_aero_siglas IS NOT NULL AND LTRIM(RTRIM(tiComb.cd_aero_siglas)) <> ''''
								) > 1 then 1
								else 2 end
							else 2 end
			,Referido= dbo.fnza_ReferidosItem (f.tipo,id_item,in_TipoItem)
			,F.id_item as ''iditems''
			,F.in_TipoItem
			,ItemComtable=F.cd_item
			,CentroCosto=F.cd_cencosto
			,Evento=F.cd_evento
			,cd_tercero_codigo, ds_tercero_nombre, am_blcomision, id_consecutivounicodocumento,in_consecutivounicodocumento
			'+ @ds_conceptosAdicionalFac +'
			'+ @ds_conceptosUnificadosFac + '
			'+CASE WHEN @in_MostrarTAOCEMColumnas=1 THEN ',TarifaTAO=CASE WHEN F.in_TipoItem=1 THEN isnull(TCS.am_tarifaTAO,0) ELSE 0 END
			                                              ,IvaTAO=CASE WHEN F.in_TipoItem=1 THEN isnull(TCS.am_ivaTAO,0) ELSE 0 END
														  ,OtrosTAO=CASE WHEN F.in_TipoItem=1 THEN isnull(TCS.am_OtrosTAO,0) ELSE 0 END
														  ,TarifaCEM=CASE WHEN F.in_TipoItem=1 THEN isnull(TCS.am_tarifaCEM,0) ELSE 0 END
														  ,IvaCEM=CASE WHEN F.in_TipoItem=1 THEN isnull(TCS.am_ivaCEM,0) ELSE 0 END
														  ,OtrosCEM=CASE WHEN F.in_TipoItem=1 THEN isnull(TCS.am_OtrosCEM,0) ELSE 0 END
														 ' 
			  ELSE '' END+'
			  ,F.cd_Consecutivo_VariablesAdicionales
			  ,am_blTarifa, am_OtrosblTarifa
			  ,cd_NumeFac,Proveedor_cd_tercero_codigo=TPr.idtercero, Proveedor_ds_tercero_nombre=TPr.NOMBRETER
			  ,TipoProveedorServicio	,CodProveedorServicio	,NombreProveedorServicio
			  ,Cantidad_TiposFacturacionHoteles,Valor_TiposFacturacionHoteles
			  ,acomodacion_nombre, tipoplan_nombre, tipohabitacion_nombre 
			  ,Licitacion_codigo ,Licitacion_nombre,ds_observacion
			  ,DocRelacionado=Case	when id_CotizacionServicios is not null then (		select ct.cd_consecutivo			
																						FROM dbo.Cotizacion CT 
																						INNER JOIN dbo.CotizacionServicios CS WITH(NOLOCK) ON CS.id_Cotizacion= CT.id
																						WHERE CS.id = id_CotizacionServicios)
										else '''' end
			 ,Anulada=CASE WHEN ISNULL(Fuente_anul,'''')<>'''' THEN ''SI'' ELSE ''NO'' END
			 ,id_TiposConceptFac
			 ,Destino = ISNULL(F.Destino,'''')
			 ,Pais = ISNULL(Pa.ds_nombre,'''')
			 ,Tipocliente = CL.TipoCliente
			 ,CantidadPax = F.in_cantpax
			 ,BaseCom = F.am_basecomisionable
			 ,PorcentajeCom = F.am_porcomision
			 ,Usuario = U.Nombre
			 ,Pais_Cliente = PC.Descripcion
			 ,DivPol_cliente = DP.Desdivpolitica
			 ,Especialista = ES.ds_nombre
			 ,FAREBASIS = CASE WHEN tkt.id IS NOT NULL THEN rtrim(convert(VARCHAR(20),dbo.fnza_Get_TiqueteFareBasis(tkt.id))) ELSE NULL END
			 ,FarebasisReal = CASE WHEN tkt.id IS NOT NULL THEN dbo.fnza_Get_TiqueteFarebasisReal(tkt.id, rtrim(convert(VARCHAR(100),dbo.fnza_Get_TiqueteFareBasis(tkt.id))), F.cd_EntVend) ELSE NULL END
			 ,NumeroReembolso = CASE WHEN tkt.id IS NOT NULL THEN dbo.fnza_Get_TiqueteReembolso(tkt.cd_tiquete) ELSE NULL END
			 FROM dbo.fnza_FacturacionMejorada('
			+convert(varchar,@in_nacionalidad)+','
			+convert(varchar,@Descuento)+','
			+convert(varchar,@Anulacion)+','
			+convert(varchar,@in_FacGeneradasRem)+','
			+convert(varchar,@FechaDocumento)+','''
			+replace(convert(varchar(10),@fecha_inicio,111),'/','')+''','''
			+replace(convert(varchar(10),@fecha_fin,111),'/','')+''',NULL,'
			+CASE WHEN ISNULL(@id_Concepto_facturacion,'')='' THEN 'NULL' ELSE ''''+@id_Concepto_facturacion+'''' END +','
			+CASE WHEN ISNULL(@Id_Sucursales,'')='' THEN 'NULL' ELSE ''''+@Id_Sucursales+'''' END +','
			+CASE WHEN ISNULL(@Id_Implantes,'')='' THEN 'NULL' ELSE ''''+@Id_Implantes+'''' END +','
			+CASE WHEN ISNULL(@cd_cliente,'')='' THEN 'NULL' ELSE ''''+@cd_cliente+'''' END +','
			+CASE WHEN ISNULL(@id_Tiqueteador,'')='' THEN 'NULL' ELSE ''''+@id_Tiqueteador+'''' END +','
			+CASE WHEN ISNULL(@cd_vendedor,'')='' THEN 'NULL' ELSE ''''+@cd_vendedor+'''' END +','
			+CASE WHEN ISNULL(@cd_proveedor,'')='' THEN 'NULL' ELSE ''''+@cd_proveedor+'''' END +') AS F
			INNER JOIN Sucursales S WITH (NOLOCK) ON S.id = F.id_sucursal
			LEFT  JOIN Implantes I WITH (NOLOCK) ON I.id = F.id_Implante
			INNER JOIN ConceptoFacturacion C WITH (NOLOCK) ON C.id = F.id_ConceptoFacturacion
			LEFT JOIN clientes CL ON CL.IDCLIENTE = f.cd_cliente
			LEFT JOIN paisesc  PC ON PC.CODIGO = CL.pais
			LEFT JOIN Divpolitica  DP ON DP.IDDIVPOLITICA = CL.divpolitica
			LEFT JOIN GREmpresarial GR ON gr.CodigoGrEmpresarial = cl.GrEmpresarial
			LEFT JOIN Tiqueteadores TQ ON TQ.id = F.id_tiqueteador
			LEFT JOIN Tiqueteadores TQF ON TQF.id = F.id_tiqueteador_Facturador
			LEFT JOIN PROVEEDORES P WITH(NOLOCK) ON P.IDPROVE = F.cd_proveedor
			LEFT JOIN Terceros TPr  WITH(NOLOCK) ON TPr.IDTERCERO = P.IDTERCERO
			LEFT JOIN Entidades E WITH(NOLOCK) ON E.cd_codigo = F.cd_EntDist
			LEFT JOIN Entidades EV WITH(NOLOCK) ON EV.cd_codigo = F.cd_EntVend
			LEFT JOIN Segmento SEG WITH(NOLOCK) on SEG.IDSEGMENTO= CL.SEGMENTO
			OUTER APPLY dbo.fnza_FPTCVoucherAutorizacion_Items(F.id,NULL,F.id_item,F.in_TipoItem) AS A
			LEFT JOIN TipoVenta tp on tp.id = F.id_TipoVenta
			LEFT JOIN MAEVENDE V ON V.IDVENDE = f.cd_vendedor
			LEFT JOIN Ciudades Ci ON Ci.ds_nombre = f.Destino
			LEFT JOIN Paises Pa ON Pa.id = Ci.id_paises
			LEFT JOIN Usuario U ON U.id = f.id_usuario
			LEFT JOIN Especialista Es ON Es.id = f.id_Especialista
			LEFT JOIN dbo.tiquetes tkt WITH(NOLOCK) ON tkt.cd_tiquete = F.Documento AND tkt.id_fac_factura = F.id
			LEFT JOIN dbo.TiposDocumento TD WITH(NOLOCK) ON TD.id = tkt.id_TiposDocumento
			OUTER APPLY dbo.fnza_TotalServicio_TiqueteTable(F.id,NULL,F.Documento,'+CASE WHEN ISNULL(@ds_feeocultos ,'')='' THEN 'NULL' ELSE ''''+@ds_feeocultos +'''' END+') AS srv
			'+CASE WHEN @in_MostrarTAOCEMColumnas=1 THEN 'OUTER APPLY dbo.fnza_TaoCemScr_TiqueteTable(F.id,NULL,F.Documento) AS TCS' ELSE '' END+'
		WHERE 1 = 1
			'+CASE WHEN ISNULL(@Grupo_Empresarial,'')<>'' THEN 'AND (CL.GrEmpresarial IN (SELECT codigo FROM dbo.fnSplit('''+@Grupo_Empresarial+''','','',0,1)))' ELSE '' END+'
			'+CASE WHEN ISNULL(@cd_Tercero,'')<>'' THEN 'AND (CL.IDTERCERO IN (SELECT codigo FROM dbo.fnSplit('''+@cd_Tercero+''','','',0,1)))' ELSE '' END+'
			'+CASE WHEN ISNULL(@cd_tipoCliente,'')<>'' THEN 'AND (CL.TipoCliente IN (SELECT codigo FROM dbo.fnSplit('''+@cd_tipoCliente+''','','',0,1)))' ELSE '' END+'
			'+CASE WHEN ISNULL(@id_Segmento,'')<>'' THEN 'AND (CL.SEGMENTO IN (SELECT codigo FROM dbo.fnSplit('''+@id_Segmento+''','','',0,1)))' ELSE '' END+'
			'+CASE WHEN ISNULL(@Id_TiposVenta,'')<>'' THEN 'AND (F.Id_TipoVenta IN (SELECT codigo FROM dbo.fnSplit('''+@Id_TiposVenta+''','','',0,1)))' ELSE '' END+'
			'+CASE WHEN ISNULL(@ds_conceptosAdicional,'')<>'' THEN 'AND (C.cd_codigo NOT IN (SELECT codigo FROM dbo.fnSplit('''+@ds_conceptosAdicional+''','','',0,1)))' ELSE '' END+'
			'+CASE WHEN ISNULL(@ds_conceptosunificados,'')<>'' THEN 'AND (C.cd_codigo NOT IN (SELECT codigo FROM dbo.fnSplit('''+@ds_conceptosunificados+''','','',0,1)))' ELSE '' END+'
			'+CASE WHEN ISNULL(@ds_feeocultos,'')<>'' THEN 'AND (C.cd_codigo NOT IN (SELECT codigo FROM dbo.fnSplit('''+@ds_feeocultos+''','','',0,1)) OR tkt.id IS NULL)' ELSE '' END+'
			'+CASE WHEN @in_MostrarTAOCEMColumnas=1 THEN 'AND (C.cd_codigo NOT IN(''CAN'',''CAI'',''CEM'') OR tkt.id IS NULL)' ELSE '' END+'
			'+CASE WHEN ISNULL(@id_TiposDocumentoFiltro,'')<>'' THEN 'AND (tkt.id_TiposDocumento IN (SELECT CONVERT(INT, codigo) FROM dbo.fnSplit('''+@id_TiposDocumentoFiltro+''','','',0,1)))' ELSE '' END+'
			'+ @FiltroRutaSQL +' '+ @FiltroFechasVueloSQL +' '+ @FiltroFareBasisSQL +' '+ @FiltroRevisadosSQL +' '+ @FiltroReembolsoInnerSQL
	
	-- Subbloque Remisiones (Solo se compila y ejecuta si se solicitaron remisiones)
	DECLARE @QueryRemisiones VARCHAR(MAX) = ''
	IF @in_Remision = 1 OR @in_RemFacturadas = 1 OR @in_FacGeneradasRem = 1
	BEGIN
		SET @QueryRemisiones = '
		UNION ALL
		
		SELECT
			F.Tipo
			,F.id
			,Fuente
			,Numero
			,Fuente+Numero as ''factura''
			,dt_fechacont
			,s.cd_codigo AS ''Sucursal''
			,I.cd_codigo AS ''Implante''
			,cd_cliente
			,ds_cliente
			,f.cd_vendedor
			,v.NOMBVENDE as ''ds_vendedor''
			,ISNULL(V.Identificacion, '''') as ''Identificacion_vendedor''
			,V.telefono as ''Tel_vendedor''  
			,V.Direccion as ''Dir_vendedor''  
			,V.Email as ''Correo_vendedor'' 
			,Case 
				When id_ConceptoFacturacion IN (1,2) Then ''Tiquete''
				When id_ConceptoFacturacion IN (4,5) Then ''TAO''
				Else ''Servicio''
			End AS ''Item''
			,C.ds_nombre AS ''Concepto''
			,Documento
			,isnull(TipoServicio,''No Especificado'') AS TipoServicio
			,Servicio
			,Clase
			,Pasajero
			,Case 
				When id_ConceptoFacturacion IN (1,2) Then Servicio
				Else ''''
			End AS ''Ruta''
			,Case 
				When id_ConceptoFacturacion IN (1,2) Then ''Boleto Aereo No.'' + SPACE(1)
															+ Documento + SPACE(1) 
															+ Servicio + SPACE(1) 
															+ ev.cd_siglas + SPACE(1) + cd_EntVend + SPACE(1) 
															+ Pasajero
				When id_TiposConceptFac = 2 Then Servicio
				When id_TiposConceptFac in (3,4) Then C.ds_nombre
				Else ''''
			End AS ''DescripcionCompleta''
			,F.Tarifa'+CASE WHEN @in_MostrarCombustible=0 THEN '+ISNULL(F.CMBCobrado,0)' ELSE '' END + ' - CASE WHEN ISNULL(F.CMBCobrado,0)<>0 AND ISNULL(F.CMB,0)=0 THEN ISNULL(F.CMBCobrado,0) ELSE 0 END AS ''Tarifa''
			,'+CASE WHEN @in_MostrarCombustible=0 THEN '0' ELSE 'ISNULL(F.CMBCobrado,0)' END +' AS ''Combustible''
			,Iva
			,Otros = CASE WHEN '+convert(varchar,@Descuento)+' = 1 THEN f.OtrosDesc-F.CMB ELSE Otros-F.CMB END + CASE WHEN F.in_TipoItem = 1 THEN ISNULL(srv.am_valor,0) ELSE 0 END 
			,F.TUA
			,Descuentos
			,Case When F.in_TipoItem = 1 THEN f.Documento ELSE CONVERT(VARCHAR,id_item) END as ''id_item''	
			,f.ds_records as ''Records''		
			,CASE WHEN F.in_TipoItem = 1 THEN CASE WHEN CHARINDEX(''/'', F.Servicio) > 0 THEN LEN(F.Servicio) - LEN(REPLACE(F.Servicio, ''/'', '''')) ELSE 1 END
				WHEN (F.in_TipoItem = 2 OR F.in_TipoItem = 3) AND F.ds_records IS NOT NULL THEN 1
				ELSE 0
			END AS ''NSegmentos'', 1 as ''Transacciones''
			,F.Tarifa + ISNULL(f.CMBCobrado,0) - CASE WHEN ISNULL(F.CMBCobrado,0)<>0 AND ISNULL(F.CMB,0)=0 THEN ISNULL(F.CMBCobrado,0) ELSE 0 END as ''tarifa_neta''
			,F.am_blTarifa as ''VentasTotales''
			,F.dt_salida
			,F.dt_llegada
			,Revisado = F.cd_tktrevisado
			,Conjuncion = F.cd_tktconj
			,NConjuncion = F.in_numtktconj
			,CASE WHEN Rtrim(isnull(F.cd_TipoTiqueteGDS,''''))=''EMD'' THEN ''SI'' ELSE ''NO'' END AS ''Penalidad''
			,FechaExpedicion = F.dt_fechaexped
			,Nacionalidad
			,TQ.ds_nombre+'' - ''+TQ.cd_codigo AS ''Tiqueteador''	
			,cd_EntVend +'' - ''+ ds_EntVend As ''EntVendedora''
			,cd_EntDist +'' - ''+ ds_EntDist As ''EntDistribuidora''
			,F.cd_TipoTiqueteGDS
			,id_TiposDocumento = tkt.id_TiposDocumento
			,cd_TipoDocumento = ISNULL(TD.cd_codigo, '''')
			,TipoDocumento = ISNULL(TD.ds_nombre, '''')
			,CASE WHEN I.cd_codigo IS NULL THEN isnull(S.cd_codigo,'''')+'' - ''+isnull(S.ds_nombre,'''') ELSE  isnull(I.cd_codigo,'''')+'' - ''+isnull(I.ds_nombre,'''') END AS ''OficinaVenta'' 	
			,isnull(S.cd_codigo,'''')+'' - ''+isnull(S.ds_nombre,'''') AS ''OficinaFactura''	
			,TQF.ds_nombre+'' - ''+TQF.cd_codigo AS ''Facturador''
			,Proveedor = P.RAZONCIAL
			,F.TarifaMax 
			,F.TarifaMin
			,F.CodigoAhorro
			,F.TarifaCobrada
			,F.am_desah
			,F.cencosto_interno	
			,TiqueteUtilizado = Case When F.in_TipoItem = 1 THEN Case When f.bl_noutilizado = 0 THEN ''UTILIZADO'' ELSE ''NO UTILIZADO'' END ELSE '''' END
			,Case When F.in_TipoItem = 1 THEN CASE WHEN E.bl_nogds=1 THEN ''NO'' ELSE ''SI'' END ELSE '''' END AS ''Gds''
			,CASE WHEN ISNULL(F.tasa,0)=0 THEN 1 ELSE F.tasa END AS ''tasa''
			,SEG.DESSEGMENTO as ''ClienteSegmento''
			,ISNULL(A.ds_tcvoucher,'''') as ''Voucher''
			,ISNULL(A.ds_tcautorizacion,'''') as ''Autorizacion''
			,F.Contado
			,F.Credito		
			,F.am_tcambio
			,TarjetaCredito = case when id_ConceptoFacturacion in (1,2) then dbo.fnza_TC_Items(1, id_item)
					            when id_ConceptoFacturacion in (3,4) then dbo.fnza_TC_Items(2, id_item)
								else dbo.fnza_TC_Items(3, id_item) end
			,GrEmpresarial = CASE WHEN ISNULL(CodigoGrEmpresarial,'''') <> '''' THEN GR.Nombre ELSE CL.RAZONCIAL END
			,tp.ds_nombre AS ''TipoVenta''
			,Vuelo = case when id_ConceptoFacturacion in (1,2) then 
						STUFF((
							SELECT '' - '' + RTRIM(ISNULL(ti2.cd_aero_siglas, '''')) + RTRIM(ti2.ds_NumVuelo)
							FROM (
								SELECT MIN(ti2.orden) as orden, ti2.cd_aero_siglas, ti2.ds_NumVuelo
								FROM dbo.Tiquetes_Itinerarios ti2 WITH(NOLOCK)
								WHERE ti2.id_Tiquetes = tkt.id AND ti2.ds_NumVuelo IS NOT NULL AND LTRIM(RTRIM(ti2.ds_NumVuelo)) <> ''''
								GROUP BY ti2.cd_aero_siglas, ti2.ds_NumVuelo
							) ti2
							ORDER BY ti2.orden
							FOR XML PATH('''')
						), 1, 3, '''')
					ELSE NULL END
			,Aerolinea = case when id_ConceptoFacturacion in (1,2) then 
							STUFF((
								SELECT '' - '' + RTRIM(ti2.cd_aero_siglas)
								FROM (
									SELECT DISTINCT ti2.orden, RTRIM(ti2.cd_aero_siglas) as cd_aero_siglas
									FROM dbo.Tiquetes_Itinerarios ti2 WITH(NOLOCK)
									WHERE ti2.id_Tiquetes = tkt.id 
									  AND ti2.cd_aero_siglas IS NOT NULL 
									  AND LTRIM(RTRIM(ti2.cd_aero_siglas)) <> ''''
								) ti2
								ORDER BY ti2.orden
								FOR XML PATH('''')
							), 1, 3, '''')
						ELSE NULL END
			,CombinacionAerolinea = case when id_ConceptoFacturacion in (1,2) AND tkt.id IS NOT NULL then
										case when (
											SELECT COUNT(DISTINCT tiComb.cd_aero_siglas)
											FROM dbo.Tiquetes_Itinerarios tiComb WITH(NOLOCK)
											WHERE tiComb.id_Tiquetes = tkt.id AND tiComb.cd_aero_siglas IS NOT NULL AND LTRIM(RTRIM(tiComb.cd_aero_siglas)) <> ''''
										) > 1 then ''Combinada''
										when (
											SELECT COUNT(DISTINCT tiComb.cd_aero_siglas)
											FROM dbo.Tiquetes_Itinerarios tiComb WITH(NOLOCK)
											WHERE tiComb.id_Tiquetes = tkt.id AND tiComb.cd_aero_siglas IS NOT NULL AND LTRIM(RTRIM(tiComb.cd_aero_siglas)) <> ''''
										) = 1 then ''Misma Aerolínea''
										else '''' end
									else '''' end
			,OrdenAerolinea = case when id_ConceptoFacturacion in (1,2) AND tkt.id IS NOT NULL then
								case when (
									SELECT COUNT(DISTINCT tiComb.cd_aero_siglas)
									FROM dbo.Tiquetes_Itinerarios tiComb WITH(NOLOCK)
									WHERE tiComb.id_Tiquetes = tkt.id AND tiComb.cd_aero_siglas IS NOT NULL AND LTRIM(RTRIM(tiComb.cd_aero_siglas)) <> ''''
								) = 1 then 0
								when (
									SELECT COUNT(DISTINCT tiComb.cd_aero_siglas)
									FROM dbo.Tiquetes_Itinerarios tiComb WITH(NOLOCK)
									WHERE tiComb.id_Tiquetes = tkt.id AND tiComb.cd_aero_siglas IS NOT NULL AND LTRIM(RTRIM(tiComb.cd_aero_siglas)) <> ''''
								) > 1 then 1
								else 2 end
							else 2 end
			,Referido= dbo.fnza_ReferidosItem (f.tipo,id_item,in_TipoItem)
			,F.id_item as ''iditems''
			,F.in_TipoItem
			,ItemComtable=F.cd_item
			,CentroCosto=F.cd_cencosto
			,Evento=F.cd_evento
			,cd_tercero_codigo, ds_tercero_nombre, am_blcomision, id_consecutivounicodocumento=null,in_consecutivounicodocumento=null
			'+ @ds_conceptosAdicionalRem +'
			'+ @ds_conceptosUnificadosRem + '
			'+CASE WHEN @in_MostrarTAOCEMColumnas=1 THEN ',TarifaTAO=CASE WHEN F.in_TipoItem=1 THEN isnull(TCS.am_tarifaTAO,0) ELSE 0 END
														  ,IvaTAO=CASE WHEN F.in_TipoItem=1 THEN isnull(TCS.am_ivaTAO,0) ELSE 0 END
														  ,OtrosTAO=CASE WHEN F.in_TipoItem=1 THEN isnull(TCS.am_OtrosTAO,0) ELSE 0 END
														  ,TarifaCEM=CASE WHEN F.in_TipoItem=1 THEN isnull(TCS.am_tarifaCEM,0) ELSE 0 END
														  ,IvaCEM=CASE WHEN F.in_TipoItem=1 THEN isnull(TCS.am_ivaCEM,0) ELSE 0 END
														  ,OtrosCEM=CASE WHEN F.in_TipoItem=1 THEN isnull(TCS.am_OtrosCEM,0) ELSE 0 END
														 ' 
			  ELSE '' END+'
			 ,F.cd_Consecutivo_VariablesAdicionales
			 ,am_blTarifa, am_OtrosblTarifa
			 ,cd_NumeFac,Proveedor_cd_tercero_codigo=TPr.idtercero, Proveedor_ds_tercero_nombre=TPr.NOMBRETER
			 ,TipoProveedorServicio	,CodProveedorServicio	,NombreProveedorServicio
			 ,Cantidad_TiposFacturacionHoteles,Valor_TiposFacturacionHoteles
			 ,acomodacion_nombre, tipoplan_nombre, tipohabitacion_nombre 
			 ,Licitacion_codigo ,Licitacion_nombre,ds_observacion
			 ,DocRelacionado=Case	when id_CotizacionServicios is not null then (		select ct.cd_consecutivo			
																						FROM dbo.Cotizacion CT 
																						INNER JOIN dbo.CotizacionServicios CS WITH(NOLOCK) ON CS.id_Cotizacion= CT.id
																						WHERE CS.id = id_CotizacionServicios)
										else '''' end
			 ,Anulada=CASE WHEN ISNULL(Fuente_anul,'''')<>'''' THEN ''SI'' ELSE ''NO'' END
			 ,id_TiposConceptFac
			 ,Destino = ISNULL(F.Destino,'''')
			 ,Pais = ISNULL(Pa.ds_nombre,'''')
			 ,Tipocliente = CL.TipoCliente
			 ,CantidadPax = F.in_cantpax
			 ,BaseCom = F.am_basecomisionable
			 ,PorcentajeCom = F.am_porcomision 
			 ,Usuario = U.Nombre
			 ,Pais_Cliente = PC.Descripcion
			 ,DivPol_cliente = DP.Desdivpolitica
			 ,Especialista = ES.ds_nombre
			 ,FAREBASIS = CASE WHEN tkt.id IS NOT NULL THEN convert(varchar(20),dbo.fnza_Get_TiqueteFareBasis(tkt.id)) ELSE NULL END
			 ,FarebasisReal = CASE WHEN tkt.id IS NOT NULL THEN dbo.fnza_Get_TiqueteFarebasisReal(tkt.id, convert(VARCHAR(100),dbo.fnza_Get_TiqueteFareBasis(tkt.id)), F.cd_EntVend) ELSE NULL END
			 ,NumeroReembolso = CASE WHEN tkt.id IS NOT NULL THEN dbo.fnza_Get_TiqueteReembolso(tkt.cd_tiquete) ELSE NULL END
		FROM dbo.fnza_RemisionMejorada('
			+convert(varchar,@in_nacionalidad)+','
			+convert(varchar,@Descuento)+','
			+convert(varchar,@Anulacion)+','
			+convert(varchar,@in_remision)+','
			+convert(varchar,@in_RemFacturadas)+','
			+convert(varchar,@FechaDocumento)+','''
			+replace(convert(varchar(10),@fecha_inicio,111),'/','')+''','''
			+replace(convert(varchar(10),@fecha_fin,111),'/','')+''',NULL,'
			+CASE WHEN ISNULL(@id_Concepto_facturacion,'')='' THEN 'NULL' ELSE ''''+@id_Concepto_facturacion+'''' END +','
			+CASE WHEN ISNULL(@Id_Sucursales,'')='' THEN 'NULL' ELSE ''''+@Id_Sucursales+'''' END +','
			+CASE WHEN ISNULL(@Id_Implantes,'')='' THEN 'NULL' ELSE ''''+@Id_Implantes+'''' END +','
			+CASE WHEN ISNULL(@cd_cliente,'')='' THEN 'NULL' ELSE ''''+@cd_cliente+'''' END +','
			+CASE WHEN ISNULL(@id_Tiqueteador,'')='' THEN 'NULL' ELSE ''''+@id_Tiqueteador+'''' END +','
			+CASE WHEN ISNULL(@cd_vendedor,'')='' THEN 'NULL' ELSE ''''+@cd_vendedor+'''' END +','
			+CASE WHEN ISNULL(@cd_proveedor,'')='' THEN 'NULL' ELSE ''''+@cd_proveedor+'''' END +') AS F
			INNER JOIN Sucursales S WITH (NOLOCK) ON S.id = F.id_sucursal
			LEFT  JOIN Implantes I WITH (NOLOCK) ON I.id = F.id_Implante
			INNER JOIN ConceptoFacturacion C WITH (NOLOCK) ON C.id = F.id_ConceptoFacturacion
			LEFT JOIN clientes CL ON CL.IDCLIENTE = f.cd_cliente
			LEFT JOIN paisesc  PC ON PC.CODIGO = CL.pais
			LEFT JOIN Divpolitica  DP ON DP.IDDIVPOLITICA = CL.divpolitica
			LEFT JOIN GREmpresarial GR ON gr.CodigoGrEmpresarial = cl.GrEmpresarial
			LEFT JOIN Tiqueteadores TQ ON TQ.id = F.id_tiqueteador
			LEFT JOIN Tiqueteadores TQF ON TQF.id = F.id_tiqueteador_Facturador
			LEFT JOIN PROVEEDORES P WITH(NOLOCK) ON P.IDPROVE = F.cd_proveedor
			LEFT JOIN Terceros TPr  WITH(NOLOCK) ON TPr.IDTERCERO = P.IDTERCERO
			LEFT JOIN Entidades E WITH(NOLOCK) ON E.cd_codigo = F.cd_EntDist
			LEFT JOIN Entidades EV WITH(NOLOCK) ON EV.cd_codigo = F.cd_EntVend
			LEFT JOIN Segmento SEG WITH(NOLOCK) on SEG.IDSEGMENTO= CL.SEGMENTO
			OUTER APPLY dbo.fnza_FPTCVoucherAutorizacion_Items(NULL,F.id,F.id_item,F.in_TipoItem) AS A
			LEFT JOIN TipoVenta tp on tp.id = F.id_TipoVenta
			LEFT JOIN MAEVENDE V ON V.IDVENDE = f.cd_vendedor
			LEFT JOIN Ciudades Ci ON Ci.ds_nombre = f.Destino
			LEFT JOIN Paises Pa ON Pa.id = Ci.id_paises
			LEFT JOIN Usuario U ON U.id = f.id_usuario
			LEFT JOIN Especialista Es ON Es.id = f.id_Especialista
			LEFT JOIN dbo.tiquetes tkt WITH(NOLOCK) ON tkt.cd_tiquete = F.Documento AND tkt.id_fac_remision = F.id
			LEFT JOIN dbo.TiposDocumento TD WITH(NOLOCK) ON TD.id = tkt.id_TiposDocumento
			OUTER APPLY dbo.fnza_TotalServicio_TiqueteTable(NULL,F.id,F.Documento,'+CASE WHEN ISNULL(@ds_feeocultos ,'')='' THEN 'NULL' ELSE ''''+@ds_feeocultos +'''' END+') AS srv
			'+CASE WHEN @in_MostrarTAOCEMColumnas=1 THEN 'OUTER APPLY dbo.fnza_TaoCemScr_TiqueteTable(NULL,F.id,F.Documento) AS TCS' ELSE '' END+'
		WHERE 1 = 1
			'+CASE WHEN ISNULL(@Grupo_Empresarial,'')<>'' THEN 'AND (CL.GrEmpresarial IN (SELECT codigo FROM dbo.fnSplit('''+@Grupo_Empresarial+''','','',0,1)))' ELSE '' END+'
			'+CASE WHEN ISNULL(@cd_Tercero,'')<>'' THEN 'AND (CL.IDTERCERO IN (SELECT codigo FROM dbo.fnSplit('''+@cd_Tercero+''','','',0,1)))' ELSE '' END+'
			'+CASE WHEN ISNULL(@cd_tipoCliente,'')<>'' THEN 'AND (CL.TipoCliente IN (SELECT codigo FROM dbo.fnSplit('''+@cd_tipoCliente+''','','',0,1)))' ELSE '' END+'
			'+CASE WHEN ISNULL(@id_Segmento,'')<>'' THEN 'AND (CL.SEGMENTO IN (SELECT codigo FROM dbo.fnSplit('''+@id_Segmento+''','','',0,1)))' ELSE '' END+'
			'+CASE WHEN ISNULL(@Id_TiposVenta,'')<>'' THEN 'AND (F.Id_TipoVenta IN (SELECT codigo FROM dbo.fnSplit('''+@Id_TiposVenta+''','','',0,1)))' ELSE '' END+'
			'+CASE WHEN ISNULL(@ds_conceptosAdicional,'')<>'' THEN 'AND (C.cd_codigo NOT IN (SELECT codigo FROM dbo.fnSplit('''+@ds_conceptosAdicional+''','','',0,1)))' ELSE '' END+'
			'+CASE WHEN ISNULL(@ds_conceptosunificados,'')<>'' THEN 'AND (C.cd_codigo NOT IN (SELECT codigo FROM dbo.fnSplit('''+@ds_conceptosunificados+''','','',0,1)))' ELSE '' END+'
			'+CASE WHEN ISNULL(@ds_feeocultos,'')<>'' THEN 'AND (C.cd_codigo NOT IN (SELECT codigo FROM dbo.fnSplit('''+@ds_feeocultos+''','','',0,1)) OR tkt.id IS NULL)' ELSE '' END+'
			'+CASE WHEN @in_MostrarTAOCEMColumnas=1 THEN 'AND (C.cd_codigo NOT IN(''CAN'',''CAI'',''CEM'') OR tkt.id IS NULL)' ELSE '' END+'
			'+CASE WHEN ISNULL(@id_TiposDocumentoFiltro,'')<>'' THEN 'AND (tkt.id_TiposDocumento IN (SELECT CONVERT(INT, codigo) FROM dbo.fnSplit('''+@id_TiposDocumentoFiltro+''','','',0,1)))' ELSE '' END+'
			'+ @FiltroRutaSQL +' '+ @FiltroFechasVueloSQL +' '+ @FiltroFareBasisSQL +' '+ @FiltroRevisadosSQL +' '+ @FiltroReembolsoInnerSQL
	END

	-- Subbloque Cotizaciones (Solo se compila y ejecuta si se solicitaron etapas de cotización)
	DECLARE @QueryCotizaciones VARCHAR(MAX) = ''
	IF @Id_EtapasCotizacion IS NOT NULL AND @Id_EtapasCotizacion <> ''
	BEGIN
		SET @QueryCotizaciones = '
		UNION ALL

		SELECT
			Tipo=''CT''
			,CT.id
			,Fuente=''''
			,Numero=CT.cd_consecutivo
			,ct.cd_consecutivo as ''factura''
			,ct.dt_fechacont
			,s.cd_codigo AS ''Sucursal''
			,I.cd_codigo AS ''Implante''
			,ct.cd_cliente_codigo
			,ct.ds_cliente_nombre
			,ct.cd_vendedor
			,v.NOMBVENDE as ''ds_vendedor''
			,ISNULL(V.Identificacion, '''') as ''Identificacion_vendedor''
			,V.telefono as ''Tel_vendedor''  
			,V.Direccion as ''Dir_vendedor''  
			,V.Email as ''Correo_vendedor'' 
			, ''CotizacionServicios'' AS ''Item''
			,Cf.ds_nombre AS ''Concepto''
			,cs.cd_tiquete AS ''Documento''
			,isnull(ts.ds_nombre,''No Especificado'') AS TipoServicio
			,cs.ds_servicio AS ''Servicio''
			,Clase = '' '' 
			,CS.ds_paxape + '' '' + CS.ds_paxname AS ''Pasajero''
			,Ruta = ''''
			,Case 
				When id_TiposConceptFac = 2 Then cs.ds_servicio
				When id_TiposConceptFac in (3,4) Then Cf.ds_nombre
				Else ''''
			End AS ''DescripcionCompleta''
			,va.Tarifa
			,Combustible=0 
			,va.Iva
			,Otros =  Va.Cargos + Va.Impuestos + Va.Descuentos
			,TUA   = 0
			,va.Descuentos
			,CONVERT(VARCHAR,cs.id) AS ''id_item''	
			,CS.ds_records as ''Records''		
			, CASE WHEN CS.ds_records IS NOT NULL THEN 1 ELSE 0 END AS ''NSegmentos''
			, 1 as ''Transacciones''
			,0 As ''tarifa_neta''
			,0 as ''VentasTotales''
			,cs.dt_salida
			,cs.dt_llegada
			,Revisado = ''''
			,Conjuncion = ''''
			,NConjuncion = 0
			, ''NO'' AS ''Penalidad''
			,NULL AS ''dt_fechaexped''
			,Nacionalidad = cs.in_nacionalidad
			,TQ.ds_nombre+'' - ''+TQ.cd_codigo AS ''Tiqueteador''	
			,'''' As ''EntVendedora''
			,'''' As ''EntDistribuidora''
			,'''' As ''cd_TipoTiqueteGDS''
			,id_TiposDocumento = tkt.id_TiposDocumento
			,cd_TipoDocumento = ISNULL(TD.cd_codigo, '''')
			,TipoDocumento = ISNULL(TD.ds_nombre, '''')
			,CASE WHEN I.cd_codigo IS NULL THEN isnull(S.cd_codigo,'''')+'' - ''+isnull(S.ds_nombre,'''') ELSE  isnull(I.cd_codigo,'''')+'' - ''+isnull(I.ds_nombre,'''') END AS ''OficinaVenta'' 	
			,isnull(S.cd_codigo,'''')+'' - ''+isnull(S.ds_nombre,'''') AS ''OficinaFactura''	
			,'''' AS ''Facturador''
			,Proveedor = P.RAZONCIAL
			,TarifaMax = 0
			,TarifaMin = 0
			,CodigoAhorro  = ''''
			,TarifaCobrada = 0
			,am_desah = 0
			,cencosto_interno	= ''''
			,TiqueteUtilizado = ''''
			,'''' AS ''Gds''
			,CASE WHEN ISNULL(CT.am_tcambiousd,0)=0 THEN 1 ELSE CT.am_tcambiousd END AS ''tasa''
			,SEG.DESSEGMENTO as ''ClienteSegmento''
			,'''' as ''Voucher''
			,'''' as ''Autorizacion''
			,Contado=0
			,Credito=0
			,ct.am_tcambio
			,TarjetaCredito = ''''
			,GrEmpresarial = CASE WHEN ISNULL(CodigoGrEmpresarial,'''') <> '''' THEN GR.Nombre ELSE CL.RAZONCIAL END
			,tp.ds_nombre AS ''TipoVenta''
			,Vuelo = ''''
			,Aerolinea = ''''
			,CombinacionAerolinea = ''''
			,OrdenAerolinea = 2
			,Referido= dbo.fnza_ReferidosItem (''CT'',CS.id,3)
			,CS.id AS ''iditems''
			,3 AS ''in_TipoItem''
			,ItemComtable=CS.cd_item
			,CentroCosto=CS.cd_cencosto
			,Evento=Ev.cd_codigo
			,cd_tercero_codigo, ds_tercero_nombre, am_blcomision=0, id_consecutivounicodocumento=NULL,in_consecutivounicodocumento=null
			'+ @ds_conceptosAdicionalCot +'
			'+ @ds_conceptosUnificadosCot + '
			'+CASE WHEN @in_MostrarTAOCEMColumnas=1 THEN ',TarifaTAO=0
			 											  ,IvaTAO=0
														  ,OtrosTAO=0
														  ,TarifaCEM=0
														  ,IvaCEM=0
														  ,OtrosCEM=0
														 ' 
			  ELSE '' END+'
			  ,CS.cd_Consecutivo_VariablesAdicionales
			  ,am_blTarifa=0, am_OtrosblTarifa=0
			  ,cd_NumeFac,Proveedor_cd_tercero_codigo=TPr.idtercero, Proveedor_ds_tercero_nombre=TPr.NOMBRETER
			  ,TipoProveedorServicio	='''',CodProveedorServicio	='''',NombreProveedorServicio=''''
			  ,Cantidad_TiposFacturacionHoteles=0,Valor_TiposFacturacionHoteles=0
			  ,acomodacion_nombre='''', tipoplan_nombre='''', tipohabitacion_nombre =''''
			  ,Licitacion_codigo='''' ,Licitacion_nombre='''',ds_observacion=''''
			  ,DocRelacionado = Case	when CS.id_fac_factura is not null then (Select cd_fuente+numero from fac_Factura where id=CS.id_fac_factura)
										when CS.id_fac_remision is not null then (Select cd_fuente+numero from fac_remision where id=CS.id_fac_remision)
										else '''' end
			  ,Anulada=CASE WHEN ISNULL(CS.bl_anulado,'''')<>'''' THEN ''SI'' ELSE ''NO'' END
			  ,id_TiposConceptFac
			  ,Destino = ISNULL(CS.ds_destino,'''')
			  ,Pais = ISNULL(Pa.ds_nombre,'''')
			  ,Tipocliente = CL.TipoCliente
			  ,CantidadPax = CS.in_cantpax
			  ,BaseCom = CS.am_basecomisionable
			  ,PorcentajeCom = CS.am_porcomision 
			  ,Usuario = U.Nombre
			  ,Pais_Cliente = PC.Descripcion
			  ,DivPol_cliente = DP.Desdivpolitica
			  ,Especialista = ES.ds_nombre
			  ,FAREBASIS = ''1''
			  ,FarebasisReal = ''1''
			  ,NumeroReembolso = ''''
			FROM dbo.Cotizacion CT 
				 INNER JOIN dbo.CotizacionServicios CS WITH(NOLOCK) ON CS.id_Cotizacion= CT.id
				 INNER JOIN dbo.Etapas E On e.id=ct.id_etapa
  				 LEFT JOIN Sucursales S ON S.id = CT.id_sucursal
				 LEFT JOIN Implantes I ON I.id =CT.id_implante
				 OUTER APPLY dbo.fnza_CotizacionesServicios_TotalesTable(CS.id) AS Va
				 INNER JOIN dbo.ConceptoFacturacion cf on cf.id = cs.id_ConceptoFacturacion
				 LEFT JOIN dbo.TiposServicios ts on ts.id = cs.id_tiposservicio
				 INNER JOIN dbo.Tiqueteadores tq on tq.id = ct.id_tiqueteador
				 INNER JOIN dbo.Clientes Cl On Cl.idcliente = CT.cd_cliente_codigo
				 LEFT JOIN paisesc  PC ON PC.CODIGO = CL.pais
				 LEFT JOIN Divpolitica  DP ON DP.IDDIVPOLITICA = CL.divpolitica
				 LEFT JOIN GREmpresarial GR On gr.CodigoGrEmpresarial = cl.GrEmpresarial
				 LEFT JOIN dbo.Segmento Seg On Seg.IdSegmento = Cl.Segmento
				 LEFT JOIN dbo.Proveedores P On P.IDprove = CS.cd_proveedores
				 LEFT JOIN Terceros TPr  WITH(NOLOCK) ON TPr.IDTERCERO = P.IDTERCERO
				 LEFT JOIN MAEVENDE V ON V.IDVENDE = ct.cd_vendedor
				 LEFT JOIN TipoVenta tp on tp.id = CT.id_TipoVenta
				 LEFT JOIN Eventos Ev ON Ev.id = CT.id_Evento
				 LEFT JOIN Ciudades Ci ON Ci.ds_nombre = CS.ds_destino
				 LEFT JOIN Paises Pa ON Pa.id = Ci.id_paises
				 LEFT JOIN Usuario U ON U.id = CT.id_usuario
				 LEFT JOIN Especialista Es ON Es.id = CT.id_Especialista
				 LEFT JOIN dbo.tiquetes tkt WITH(NOLOCK) ON tkt.cd_tiquete = cs.cd_tiquete
				 LEFT JOIN dbo.TiposDocumento TD WITH(NOLOCK) ON TD.id = tkt.id_TiposDocumento
			 WHERE CT.dt_fechacont >= '''+replace(convert(varchar(10),@fecha_inicio,111),'/','')+ '''
				   AND CT.dt_fechacont <= '''+replace(convert(varchar(10),@fecha_fin,111),'/','')+'''
				   AND CS.id_TiposConceptFac=2
				   AND (CS.bl_anulado = 0 OR CS.bl_anulado=' + convert(varchar,@Anulacion) + ')
				   '+CASE WHEN ISNULL(@Grupo_Empresarial,'')<>'' THEN 'AND (CL.GrEmpresarial IN (SELECT codigo FROM dbo.fnSplit('''+@Grupo_Empresarial+''','','',0,1)))' ELSE '' END+'
				   '+CASE WHEN ISNULL(@cd_Tercero,'')<>'' THEN 'AND (CL.IDTERCERO IN (SELECT codigo FROM dbo.fnSplit('''+@cd_Tercero+''','','',0,1)))' ELSE '' END+'
				   '+CASE WHEN ISNULL(@cd_tipoCliente,'')<>'' THEN 'AND (CL.TipoCliente IN (SELECT codigo FROM dbo.fnSplit('''+@cd_tipoCliente+''','','',0,1)))' ELSE '' END+'
				   '+CASE WHEN ISNULL(@id_Segmento,'')<>'' THEN 'AND (CL.SEGMENTO IN (SELECT codigo FROM dbo.fnSplit('''+@id_Segmento+''','','',0,1)))' ELSE '' END+'
				   '+CASE WHEN ISNULL(@cd_vendedor,'')<>'' THEN 'AND (CT.cd_vendedor IN (SELECT codigo FROM dbo.fnSplit('''+@cd_vendedor+''','','',0,1)))' ELSE '' END+'
				   '+CASE WHEN ISNULL(@Id_TiposVenta,'')<>'' THEN 'AND (CT.Id_TipoVenta IN (SELECT codigo FROM dbo.fnSplit('''+@Id_TiposVenta+''','','',0,1)))' ELSE '' END+'
				   '+CASE WHEN ISNULL(@cd_ConceptoFacturacion,'')<>'' THEN 'AND (Cf.cd_codigo IN (SELECT codigo FROM dbo.fnSplit('''+@cd_ConceptoFacturacion+''','','',0,1)))' ELSE '' END+'
				   '+CASE WHEN ISNULL(@cd_Tiqueteador,'')<>'' THEN 'AND (tq.cd_codigo IN (SELECT codigo FROM dbo.fnSplit('''+@cd_Tiqueteador+''','','',0,1)))' ELSE '' END+'
				   '+CASE WHEN ISNULL(@cd_proveedor,'')<>'' THEN 'AND (CS.cd_proveedores IN (SELECT codigo FROM dbo.fnSplit('''+@cd_proveedor+''','','',0,1)))' ELSE '' END+'
				   AND (E.Id IN (SELECT codigo FROM dbo.fnSplit('''+@Id_EtapasCotizacion+''','','',0,1)))
				   '+CASE WHEN ISNULL(@ds_conceptosAdicional,'')<>'' THEN 'AND (cf.cd_codigo NOT IN (SELECT codigo FROM dbo.fnSplit('''+@ds_conceptosAdicional+''','','',0,1)) OR CS.cd_tiquete IS NULL)' ELSE '' END+'
				   '+CASE WHEN ISNULL(@ds_conceptosunificados,'')<>'' THEN 'AND (CF.cd_codigo NOT IN (SELECT codigo FROM dbo.fnSplit('''+@ds_conceptosunificados+''','','',0,1)))' ELSE '' END+'
				   '+CASE WHEN ISNULL(@ds_feeocultos,'')<>'' THEN 'AND (cf.cd_codigo NOT IN (SELECT codigo FROM dbo.fnSplit('''+@ds_feeocultos+''','','',0,1)) OR CS.cd_tiquete IS NULL)' ELSE '' END+'
				   '+CASE WHEN ISNULL(@id_TiposDocumentoFiltro,'')<>'' THEN 'AND (tkt.id_TiposDocumento IN (SELECT CONVERT(INT, codigo) FROM dbo.fnSplit('''+@id_TiposDocumentoFiltro+''','','',0,1)))' ELSE '' END+'
			' + @FiltroFechasVueloCotSQL + CASE WHEN @MostrarSoloRevisados = 'SI' OR @cd_FareBasis IS NOT NULL OR @cd_FarebasisReal IS NOT NULL OR @MostrarSoloReembolsos = 'SI' THEN ' AND 1 = 0' ELSE '' END
	END

	-- Subbloque Notas de Crédito Parcial (Solo se compila y ejecuta si se solicitaron anulaciones)
	DECLARE @QueryNotasCredito VARCHAR(MAX) = ''
	IF @Anulacion = 1
	BEGIN
		SET @QueryNotasCredito = '
		UNION ALL

		SELECT 
			F.Tipo
			,F.id
			,Fuente
			,Numero
			,Fuente+Numero as ''factura''
			,dt_fechacont
			,s.cd_codigo AS ''Sucursal''
			,I.cd_codigo AS ''Implante''
			,cd_cliente
			,ds_cliente
			,f.cd_vendedor
			,v.NOMBVENDE as ''ds_vendedor''
			,ISNULL(V.Identificacion, '''') as ''Identificacion_vendedor''
			,V.telefono as ''Tel_vendedor''  
			,V.Direccion as ''Dir_vendedor''  
			,V.Email as ''Correo_vendedor'' 
			,Case 
				When id_ConceptoFacturacion IN (1,2) AND id_TiposConceptFac = 1 Then ''Tiquete''
				When id_ConceptoFacturacion IN (4,5) Then ''TAO''
				Else ''Servicio''
			End AS ''Item''
			,C.ds_nombre AS ''Concepto''
			,Documento
			,isnull(TipoServicio,'''') AS TipoServicio
			,Servicio
			,Clase
			,Pasajero
			,Case 
				When id_ConceptoFacturacion IN (1,2) Then Servicio
				Else ''''
			End AS ''Ruta''
			,Case 
				When id_ConceptoFacturacion IN (1,2) Then ''Boleto Aereo No.'' + SPACE(1)
															+ Documento + SPACE(1) 
															+ Servicio + SPACE(1) 
															+ ev.cd_siglas + SPACE(1) + cd_EntVend + SPACE(1) 
															+ Pasajero
				When id_TiposConceptFac = 2 Then Servicio
				When id_TiposConceptFac in (3,4) Then C.ds_nombre
				Else ''''
			End AS ''DescripcionCompleta''
			,F.Tarifa'+CASE WHEN @in_MostrarCombustible=0 THEN '+ISNULL(F.CMB,0)' ELSE '' END + ' AS ''Tarifa''
			,'+CASE WHEN @in_MostrarCombustible=0 THEN '0' ELSE 'ISNULL(F.CMB,0)' END +' AS ''Combustible''
			,F.Iva
			,Otros = CASE WHEN '+convert(varchar,@Descuento)+' = 1 THEN f.OtrosDesc-F.CMB ELSE Otros-F.CMB END + CASE WHEN F.in_TipoItem = 1 THEN ISNULL(srv.am_valor,0) ELSE 0 END
			,F.TUA
			,F.Descuentos
			,Case When F.in_TipoItem = 1 THEN f.Documento ELSE CONVERT(VARCHAR,id_item) END as ''id_item''
			,f.ds_records as ''Records''
			,CASE WHEN F.in_TipoItem = 1 THEN CASE WHEN CHARINDEX(''/'', F.Servicio) > 0 THEN LEN(F.Servicio) - LEN(REPLACE(F.Servicio, ''/'', '''')) ELSE 1 END
				WHEN (F.in_TipoItem = 2 OR F.in_TipoItem = 3) AND F.ds_records IS NOT NULL THEN 1
				ELSE 0
			END AS ''NSegmentos''
			, 1 as ''Transacciones''
			,F.Tarifa + ISNULL(f.CMB,0) as ''tarifa_neta''
			,F.am_blTarifa as ''VentasTotales''
			,F.dt_salida
			,F.dt_llegada
			,Revisado = F.cd_tktrevisado
			,Conjuncion = F.cd_tktconj
			,NConjuncion = F.in_numtktconj
			,CASE WHEN Rtrim(isnull(F.cd_TipoTiqueteGDS,''''))=''EMD'' THEN ''SI'' ELSE ''NO'' END AS ''Penalidad''
			,FechaExpedicion = F.dt_fechaexped
			,Nacionalidad
			,TQ.ds_nombre+'' - ''+TQ.cd_codigo AS ''Tiqueteador''	
			,cd_EntVend +'' - ''+ ds_EntVend As ''EntVendedora''
			,cd_EntDist +'' - ''+ ds_EntDist As ''EntDistribuidora''
			,F.cd_TipoTiqueteGDS
			,id_TiposDocumento = tkt.id_TiposDocumento
			,cd_TipoDocumento = ISNULL(TD.cd_codigo, '''')
			,TipoDocumento = ISNULL(TD.ds_nombre, '''')
			,CASE WHEN I.cd_codigo IS NULL THEN isnull(S.cd_codigo,'''')+'' - ''+isnull(S.ds_nombre,'''') ELSE  isnull(I.cd_codigo,'''')+'' - ''+isnull(I.ds_nombre,'''') END AS ''OficinaVenta'' 	
			,isnull(S.cd_codigo,'''')+'' - ''+isnull(S.ds_nombre,'''') AS ''OficinaFactura''	
			,TQF.ds_nombre+'' - ''+TQF.cd_codigo AS ''Facturador''
			,Proveedor = P.RAZONCIAL 
			,F.TarifaMax 
			,F.TarifaMin
			,F.CodigoAhorro
			,F.TarifaCobrada
			,F.am_desah
			,F.cencosto_interno	
			,TiqueteUtilizado = Case When F.in_TipoItem = 1 THEN Case When f.bl_noutilizado = 0 THEN ''UTILIZADO'' ELSE ''NO UTILIZADO'' END ELSE '''' END
			,Case When F.in_TipoItem = 1 THEN CASE WHEN E.bl_nogds=1 THEN ''NO'' ELSE ''SI'' END ELSE '''' END AS ''Gds''
			,CASE WHEN ISNULL(F.tasa,0)=0 THEN 1 ELSE F.tasa END AS ''tasa''
			,SEG.DESSEGMENTO as ''ClienteSegmento''
			,ISNULL(A.ds_tcvoucher,'''') as ''Voucher''
			,ISNULL(A.ds_tcautorizacion,'''') as ''Autorizacion''
			,F.Contado
			,F.Credito	
			,F.am_tcambio
			,TarjetaCredito = case when id_ConceptoFacturacion in (1,2) then dbo.fnza_TC_Items(1, id_itmfac)
					            when id_ConceptoFacturacion in (3,4) then dbo.fnza_TC_Items(2, id_itmfac)
								else dbo.fnza_TC_Items(3, id_itmfac) end
			,GrEmpresarial = CASE WHEN ISNULL(CodigoGrEmpresarial,'''') <> '''' THEN GR.Nombre ELSE CL.RAZONCIAL END
			,tp.ds_nombre AS ''TipoVenta''
			,Vuelo = case when id_ConceptoFacturacion in (1,2) then 
						STUFF((
							SELECT '' - '' + RTRIM(ISNULL(ti2.cd_aero_siglas, '''')) + RTRIM(ti2.ds_NumVuelo)
							FROM (
								SELECT MIN(ti2.orden) as orden, ti2.cd_aero_siglas, ti2.ds_NumVuelo
								FROM dbo.Tiquetes_Itinerarios ti2 WITH(NOLOCK)
								WHERE ti2.id_Tiquetes = tkt.id AND ti2.ds_NumVuelo IS NOT NULL AND LTRIM(RTRIM(ti2.ds_NumVuelo)) <> ''''
								GROUP BY ti2.cd_aero_siglas, ti2.ds_NumVuelo
							) ti2
							ORDER BY ti2.orden
							FOR XML PATH('''')
						), 1, 3, '''')
					ELSE NULL END
			,Aerolinea = case when id_ConceptoFacturacion in (1,2) then 
							STUFF((
								SELECT '' - '' + RTRIM(ti2.cd_aero_siglas)
								FROM (
									SELECT DISTINCT ti2.orden, RTRIM(ti2.cd_aero_siglas) as cd_aero_siglas
									FROM dbo.Tiquetes_Itinerarios ti2 WITH(NOLOCK)
									WHERE ti2.id_Tiquetes = tkt.id 
									  AND ti2.cd_aero_siglas IS NOT NULL 
									  AND LTRIM(RTRIM(ti2.cd_aero_siglas)) <> ''''
								) ti2
								ORDER BY ti2.orden
								FOR XML PATH('''')
							), 1, 3, '''')
						ELSE NULL END
			,CombinacionAerolinea = case when id_ConceptoFacturacion in (1,2) AND tkt.id IS NOT NULL then
										case when (
											SELECT COUNT(DISTINCT tiComb.cd_aero_siglas)
											FROM dbo.Tiquetes_Itinerarios tiComb WITH(NOLOCK)
											WHERE tiComb.id_Tiquetes = tkt.id AND tiComb.cd_aero_siglas IS NOT NULL AND LTRIM(RTRIM(tiComb.cd_aero_siglas)) <> ''''
										) > 1 then ''Combinada''
										when (
											SELECT COUNT(DISTINCT tiComb.cd_aero_siglas)
											FROM dbo.Tiquetes_Itinerarios tiComb WITH(NOLOCK)
											WHERE tiComb.id_Tiquetes = tkt.id AND tiComb.cd_aero_siglas IS NOT NULL AND LTRIM(RTRIM(tiComb.cd_aero_siglas)) <> ''''
										) = 1 then ''Misma Aerolínea''
										else '''' end
									else '''' end
			,OrdenAerolinea = case when id_ConceptoFacturacion in (1,2) AND tkt.id IS NOT NULL then
								case when (
									SELECT COUNT(DISTINCT tiComb.cd_aero_siglas)
									FROM dbo.Tiquetes_Itinerarios tiComb WITH(NOLOCK)
									WHERE tiComb.id_Tiquetes = tkt.id AND tiComb.cd_aero_siglas IS NOT NULL AND LTRIM(RTRIM(tiComb.cd_aero_siglas)) <> ''''
								) = 1 then 0
								when (
									SELECT COUNT(DISTINCT tiComb.cd_aero_siglas)
									FROM dbo.Tiquetes_Itinerarios tiComb WITH(NOLOCK)
									WHERE tiComb.id_Tiquetes = tkt.id AND tiComb.cd_aero_siglas IS NOT NULL AND LTRIM(RTRIM(tiComb.cd_aero_siglas)) <> ''''
								) > 1 then 1
								else 2 end
							else 2 end
			,Referido= dbo.fnza_ReferidosItem (f.cd_tipofac,id_itmfac,in_TipoItem)
			,F.id_item as ''iditems''
			,F.in_TipoItem
			,ItemComtable=F.cd_item
			,CentroCosto=F.cd_cencosto
			,Evento=F.cd_evento
			,cd_tercero_codigo=null, ds_tercero_nombre=null, am_blcomision=0, id_consecutivounicodocumento=NULL,in_consecutivounicodocumento=null
			'+ @ds_conceptosAdicionalFac +'
			'+ @ds_conceptosUnificadosFac + '
			'+CASE WHEN @in_MostrarTAOCEMColumnas=1 THEN ',TarifaTAO=CASE WHEN F.in_TipoItem=1 THEN isnull(TCS.am_tarifaTAO,0) ELSE 0 END
			                                              ,IvaTAO=CASE WHEN F.in_TipoItem=1 THEN isnull(TCS.am_ivaTAO,0) ELSE 0 END
														  ,OtrosTAO=CASE WHEN F.in_TipoItem=1 THEN isnull(TCS.am_OtrosTAO,0) ELSE 0 END
														  ,TarifaCEM=CASE WHEN F.in_TipoItem=1 THEN isnull(TCS.am_tarifaCEM,0) ELSE 0 END
														  ,IvaCEM=CASE WHEN F.in_TipoItem=1 THEN isnull(TCS.am_ivaCEM,0) ELSE 0 END
														  ,OtrosCEM=CASE WHEN F.in_TipoItem=1 THEN isnull(TCS.am_OtrosCEM,0) ELSE 0 END
														 ' 
			  ELSE '' END+'
			  ,F.cd_Consecutivo_VariablesAdicionales
			  ,am_blTarifa=0, am_OtrosblTarifa=0
			  ,cd_NumeFac='''',Proveedor_cd_tercero_codigo='''', Proveedor_ds_tercero_nombre=''''
			  ,TipoProveedorServicio	='''',CodProveedorServicio	='''',NombreProveedorServicio=''''
			  ,Cantidad_TiposFacturacionHoteles=0,Valor_TiposFacturacionHoteles=0
			  ,acomodacion_nombre='''', tipoplan_nombre='''', tipohabitacion_nombre =''''
			  ,Licitacion_codigo='''' ,Licitacion_nombre='''',ds_observacion=''''
			  ,DocRelacionado=''''
			  ,Anulada=CASE WHEN ISNULL(Fuente_anul,'''')<>'''' THEN ''SI'' ELSE ''NO'' END
			  ,id_TiposConceptFac
			  ,Destino = ISNULL(F.ds_destino,'''')
			  ,Pais = ISNULL(Pa.ds_nombre,'''')
			  ,Tipocliente = CL.TipoCliente
			  ,CantidadPax = F.in_cantpax
			  ,BaseCom = F.am_basecomisionable
			  ,PorcentajeCom = F.am_porcomision 
			  ,Usuario = U.Nombre
			  ,Pais_Cliente = PC.Descripcion
			  ,DivPol_cliente = DP.Desdivpolitica
			  ,Especialista = ES.ds_nombre
			  ,FAREBASIS = CASE WHEN tkt.id IS NOT NULL THEN convert(varchar,dbo.fnza_Get_TiqueteFareBasis(tkt.id)) ELSE NULL END
			  ,FarebasisReal = CASE WHEN tkt.id IS NOT NULL THEN dbo.fnza_Get_TiqueteFarebasisReal(tkt.id, convert(VARCHAR(100),dbo.fnza_Get_TiqueteFareBasis(tkt.id)), F.cd_EntVend) ELSE NULL END
			  ,NumeroReembolso = CASE WHEN tkt.id IS NOT NULL THEN dbo.fnza_Get_TiqueteReembolso(tkt.cd_tiquete) ELSE NULL END
		FROM dbo.fnza_NotaCreditoParcial('
			+convert(varchar,@in_nacionalidad)+','
			+convert(varchar,@Descuento)+','
			+convert(varchar,@Anulacion)+','
			+convert(varchar,@in_FacGeneradasRem)+','
			+convert(varchar,@FechaDocumento)+','''
			+replace(convert(varchar(10),@fecha_inicio,111),'/','')+''','''
			+replace(convert(varchar(10),@fecha_fin,111),'/','')+''',NULL,'
			+CASE WHEN ISNULL(@id_Concepto_facturacion,'')='' THEN 'NULL' ELSE ''''+@id_Concepto_facturacion+'''' END +','
			+CASE WHEN ISNULL(@Id_Sucursales,'')='' THEN 'NULL' ELSE ''''+@Id_Sucursales+'''' END +','
			+CASE WHEN ISNULL(@Id_Implantes,'')='' THEN 'NULL' ELSE ''''+@Id_Implantes+'''' END +','
			+CASE WHEN ISNULL(@cd_cliente,'')='' THEN 'NULL' ELSE ''''+@cd_cliente+'''' END +','
			+CASE WHEN ISNULL(@id_Tiqueteador,'')='' THEN 'NULL' ELSE ''''+@id_Tiqueteador+'''' END +','
			+CASE WHEN ISNULL(@cd_vendedor,'')='' THEN 'NULL' ELSE ''''+@cd_vendedor+'''' END +','
			+CASE WHEN ISNULL(@cd_proveedor,'')='' THEN 'NULL' ELSE ''''+@cd_proveedor+'''' END +') AS F
			INNER JOIN Sucursales S WITH (NOLOCK) ON S.id = F.id_sucursal
			LEFT  JOIN Implantes I WITH (NOLOCK) ON I.id = F.id_Implante
			INNER JOIN ConceptoFacturacion C WITH (NOLOCK) ON C.id = F.id_ConceptoFacturacion
			LEFT JOIN clientes CL ON CL.IDCLIENTE = f.cd_cliente
			LEFT JOIN paisesc  PC ON PC.CODIGO = CL.pais
			LEFT JOIN Divpolitica  DP ON DP.IDDIVPOLITICA = CL.divpolitica
			LEFT JOIN GREmpresarial GR ON gr.CodigoGrEmpresarial = cl.GrEmpresarial
			LEFT JOIN Tiqueteadores TQ ON TQ.id = F.id_tiqueteador
			LEFT JOIN Tiqueteadores TQF ON TQF.id = F.id_tiqueteador_Facturador
			LEFT JOIN PROVEEDORES P WITH(NOLOCK) ON P.IDPROVE = F.cd_proveedor
			LEFT JOIN Entidades E WITH(NOLOCK) ON E.cd_codigo = F.cd_EntDist
			LEFT JOIN Entidades EV WITH(NOLOCK) ON EV.cd_codigo = F.cd_EntVend
			LEFT JOIN Segmento SEG WITH(NOLOCK) on SEG.IDSEGMENTO= CL.SEGMENTO
			OUTER APPLY dbo.fnza_FPTCVoucherAutorizacion_Items(F.id_fac,F.Id_fac_remision,F.id_itmfac,F.in_TipoItem) AS A
			LEFT JOIN TipoVenta tp on tp.id = F.id_TipoVenta
			LEFT JOIN MAEVENDE V ON V.IDVENDE = f.cd_vendedor
			LEFT JOIN Ciudades Ci ON Ci.ds_nombre = F.ds_destino
			LEFT JOIN Paises Pa ON Pa.id = Ci.id_paises
			LEFT JOIN Usuario U ON U.id = f.id_usuario
			LEFT JOIN Especialista Es ON Es.id = f.id_Especialista
			LEFT JOIN dbo.tiquetes tkt WITH(NOLOCK) ON tkt.cd_tiquete = F.Documento 
			LEFT JOIN dbo.TiposDocumento TD WITH(NOLOCK) ON TD.id = tkt.id_TiposDocumento
			OUTER APPLY dbo.fnza_TotalServicio_TiqueteNotaCreditoParcialTable(F.id,F.Documento,'+CASE WHEN ISNULL(@ds_feeocultos ,'')='' THEN 'NULL' ELSE ''''+@ds_feeocultos +'''' END+') AS srv
			'+CASE WHEN @in_MostrarTAOCEMColumnas=1 THEN 'OUTER APPLY dbo.fnza_TaoCemScr_TiqueteNotaCreditoParcialTable(F.id,F.Documento) AS TCS' ELSE '' END+'
		WHERE 1 = 1
			'+CASE WHEN ISNULL(@Grupo_Empresarial,'')<>'' THEN 'AND (CL.GrEmpresarial IN (SELECT codigo FROM dbo.fnSplit('''+@Grupo_Empresarial+''','','',0,1)))' ELSE '' END+'
			'+CASE WHEN ISNULL(@cd_Tercero,'')<>'' THEN 'AND (CL.IDTERCERO IN (SELECT codigo FROM dbo.fnSplit('''+@cd_Tercero+''','','',0,1)))' ELSE '' END+'
			'+CASE WHEN ISNULL(@cd_tipoCliente,'')<>'' THEN 'AND (CL.TipoCliente IN (SELECT codigo FROM dbo.fnSplit('''+@cd_tipoCliente+''','','',0,1)))' ELSE '' END+'
			'+CASE WHEN ISNULL(@id_Segmento,'')<>'' THEN 'AND (CL.SEGMENTO IN (SELECT codigo FROM dbo.fnSplit('''+@id_Segmento+''','','',0,1)))' ELSE '' END+'
			'+CASE WHEN ISNULL(@Id_TiposVenta,'')<>'' THEN 'AND (F.Id_TipoVenta IN (SELECT codigo FROM dbo.fnSplit('''+@Id_TiposVenta+''','','',0,1)))' ELSE '' END+'
			'+CASE WHEN ISNULL(@ds_conceptosAdicional,'')<>'' THEN 'AND (C.cd_codigo NOT IN (SELECT codigo FROM dbo.fnSplit('''+@ds_conceptosAdicional+''','','',0,1)))' ELSE '' END+'
			'+CASE WHEN ISNULL(@ds_conceptosunificados,'')<>'' THEN 'AND (C.cd_codigo NOT IN (SELECT codigo FROM dbo.fnSplit('''+@ds_conceptosunificados+''','','',0,1)))' ELSE '' END+'
			'+CASE WHEN ISNULL(@ds_feeocultos,'')<>'' THEN 'AND (C.cd_codigo NOT IN (SELECT codigo FROM dbo.fnSplit('''+@ds_feeocultos+''','','',0,1)) OR tkt.id IS NULL)' ELSE '' END+'
			'+CASE WHEN @in_MostrarTAOCEMColumnas=1 THEN 'AND (C.cd_codigo NOT IN(''CAN'',''CAI'',''CEM'') OR tkt.id IS NULL)' ELSE '' END+'
			'+CASE WHEN ISNULL(@id_TiposDocumentoFiltro,'')<>'' THEN 'AND (tkt.id_TiposDocumento IN (SELECT CONVERT(INT, codigo) FROM dbo.fnSplit('''+@id_TiposDocumentoFiltro+''','','',0,1)))' ELSE '' END+'
			'+ @FiltroRutaSQL +' '+ @FiltroFechasVueloSQL +' '+ @FiltroFareBasisSQL +' '+ @FiltroRevisadosSQL +' '+ @FiltroReembolsoInnerSQL
	END

	--------------------------------------------------------------------------------------------------
	-- Consulta Principal con Streaming Directo (Sin GROUP BY masivo redundante)
	--------------------------------------------------------------------------------------------------
	Set @SelectData ='
	SELECT 
		Tipo
		,Fuente
		,Numero
		,factura
		,dt_fechacont As ''Fecha''
		,Sucursal
		,Implante
		,cd_cliente As ''Codigo del Cliente''
		,ds_cliente As ''Nombre del Cliente''
		,cd_vendedor As ''Vendedor''
		,ds_vendedor AS ''Nombre Vendedor''
		,Identificacion_vendedor AS ''Identificacion del Vendedor''
		,Tel_Vendedor AS ''Tel_vendedor'' 
		,Dir_Vendedor AS ''Dir_vendedor'' 
		,Correo_Vendedor as ''Correo_vendedor''
		,Records
		,id_item As ''Identificador Item''
		,Item
		,Concepto
		,TipoServicio
		,Documento
		,Servicio
		,Ruta
		,DescripcionCompleta
		,replace(Clase,char(13)+Char(10),'''') As ''Clase''
		,Pasajero
		,NSegmentos
		,Transacciones
		,Tarifa
		,Combustible
		,Iva
		,Otros
		,TUA
		,Descuentos
		'+CASE WHEN @in_MostrarTAOCEMColumnas=1 THEN ',TarifaTAO
							      ,IvaTAO
							      ,OtrosTAO
							      ,TarifaCEM
							      ,IvaCEM
							      ,OtrosCEM
							     ' 
			  ELSE '' END+'
		,Total = Tarifa + Iva + Otros + Combustible+TUA '+@ds_conceptosAdicionalAux2+CASE WHEN @in_MostrarTAOCEMColumnas=1 THEN ' + TarifaTAO + IvaTAO + OtrosTAO + TarifaCEM + IvaCEM + OtrosCEM' ELSE '' END+'
		,CONVERT(VARCHAR(10), dt_salida, 120) As ''FechaSalida_CheckIN'' 
		,CONVERT(VARCHAR(10), dt_llegada, 120) As ''FechaLlegada_CheckOut'' 
		,Revisado
		,Conjuncion
		,NConjuncion
		,Penalidad
		,FechaExpedicion 
		,Nacionalidad = CASE WHEN NACIONALIDAD = 1 THEN ''Nacional'' ELSE ''Internacional'' END
		,[Nacionalidad Real] = CASE 
			WHEN Facturacion.Servicio IS NOT NULL AND CHARINDEX(''/'', REPLACE(Facturacion.Servicio, ''-'', ''/'')) > 0 AND EXISTS (
				SELECT 1 
				FROM dbo.fnSplit(REPLACE(REPLACE(UPPER(LTRIM(RTRIM(Facturacion.Servicio))), '' '', ''''), ''-'', ''/''), ''/'', 0, 1) s
				JOIN #TempCiudadesExterior ext ON ext.cd_Iata = s.codigo
				WHERE LTRIM(RTRIM(s.codigo)) <> ''''
			) THEN ''Internacional''
			WHEN Facturacion.Servicio IS NOT NULL AND CHARINDEX(''/'', REPLACE(Facturacion.Servicio, ''-'', ''/'')) > 0 
			  AND EXISTS (
				  SELECT 1 
				  FROM dbo.fnSplit(REPLACE(REPLACE(UPPER(LTRIM(RTRIM(Facturacion.Servicio))), '' '', ''''), ''-'', ''/''), ''/'', 0, 1) s
				  WHERE LTRIM(RTRIM(s.codigo)) <> ''''
			  )
			  AND NOT EXISTS (
				  SELECT 1 
				  FROM dbo.fnSplit(REPLACE(REPLACE(UPPER(LTRIM(RTRIM(Facturacion.Servicio))), '' '', ''''), ''-'', ''/''), ''/'', 0, 1) s
				  WHERE LTRIM(RTRIM(s.codigo)) <> '''' 
					AND s.codigo NOT IN (SELECT cd_Iata FROM #TempCiudadesColombia)
			  ) THEN ''Nacional''
			WHEN Facturacion.NACIONALIDAD = 1 THEN ''Nacional''
			ELSE ''Internacional''
		END
		,Tiqueteador
		,EntVendedora
		,EntDistribuidora
		,cd_TipoTiqueteGDS
		,id_TiposDocumento
		,cd_TipoDocumento
		,TipoDocumento
		,OficinaVenta
		,OficinaFactura	
		,Facturador
		,Proveedor
		,TarifaMax 
		,TarifaMin
		,CodigoAhorro
		,TarifaCobrada
		,am_desah
		,TiqueteUtilizado
		,Gds
		,Tasa
		,ClienteSegmento
		, case  MONTH (dt_fechacont) 
		when 1 then ''Enero''
		when 2 then ''Febrero''
		when 3 then ''Marzo''
		when 4 then ''Abril''
		when 5 then ''Mayo''
		when 6 then ''Junio''
		when 7 then ''Julio''
		when 8 then ''Agosto''
		when 9 then ''Septiembre''
		when 10 then ''Octubre''
		when 11 then ''Noviembre''
		when 12 then ''Diciembre''
		END	
		AS ''Mes''	
		,Voucher
		,Autorizacion
		,Contado
		,Credito
		,TarifaUSD = Tarifa / Case When am_tcambio <> 1 Then am_tcambio Else Tasa End
		,CombustibleUSD = Combustible / Case When am_tcambio <> 1 Then am_tcambio Else Tasa End
		,IvaUSD = Iva / Case When am_tcambio <> 1 Then am_tcambio Else Tasa End
		,OtrosUSD = (Otros - Descuentos - Combustible)  / Case When am_tcambio <> 1 Then am_tcambio Else Tasa End
		,DescuentosUSD = Descuentos / Case When am_tcambio <> 1 Then am_tcambio Else Tasa End
		'+CASE WHEN @in_MostrarTAOCEMColumnas=1 THEN ',TarifaTAOUSD = TarifaTAO / Case When am_tcambio <> 1 Then am_tcambio Else Tasa End
		                                              ,IvaTAOUSD = IvaTAO / Case When am_tcambio <> 1 Then am_tcambio Else Tasa End
													  ,OtrosTAOUSD = OtrosTAO / Case When am_tcambio <> 1 Then am_tcambio Else Tasa End
													  ,TarifaCEMUSD = TarifaCEM / Case When am_tcambio <> 1 Then am_tcambio Else Tasa End
													  ,IvaCEMUSD = IvaCEM / Case When am_tcambio <> 1 Then am_tcambio Else Tasa End
													  ,OtrosCEMUSD = OtrosCEM / Case When am_tcambio <> 1 Then am_tcambio Else Tasa End										 ' 
		  ELSE '' END+'
		,TotalUSD = (Tarifa + Iva + Otros'+@ds_conceptosAdicionalAux2+CASE WHEN @in_MostrarTAOCEMColumnas=1 THEN ' + TarifaTAO + IvaTAO + OtrosTAO + TarifaCEM + IvaCEM + OtrosCEM' ELSE '' END+')/ Case When am_tcambio <> 1 Then am_tcambio Else Tasa End
		,TarjetaCredito
		,GREmpresarial
		,TipoVenta
		,Comision_No_ShowUSD = dbo.fnza_ItemsNoShowComisiones(Item,id_item) / Case When am_tcambio <> 1 Then am_tcambio Else Tasa End
		,VentasTotales
		,VentasTotalesUSD = VentasTotales / Case When am_tcambio <> 1 Then am_tcambio Else Tasa End
		,Vuelo
		,Aerolinea
		,CombinacionAerolinea
		,Referido
		,ItemComtable
		,CentroCosto
		,Evento
		' + @ds_variables + '
		' + @ds_TipoProveedores + '
		' + @ds_conceptosAdicionalAux + '
		' + @ds_conceptosUnificadosAux + '
		' + @ds_conceptosAdicionalAuxUSD + '
		' + @ds_conceptosUnificadosAuxUSD + '
		' + @ds_Categorias + '
		,cd_tercero_codigo, ds_tercero_nombre, am_blcomision, in_consecutivounicodocumento AS id_consecutivounicodocumento
		,am_blTarifa, am_OtrosblTarifa
		,am_blTarifaUSD = am_blTarifa / Case When am_tcambio <> 1 Then am_tcambio Else Tasa End
		,am_OtrosblTarifaUSD = (am_OtrosblTarifa-am_blcomision) / Case When am_tcambio <> 1 Then am_tcambio Else Tasa End
		,cd_NumeFac,Proveedor_cd_tercero_codigo, Proveedor_ds_tercero_nombre
		,TipoProveedorServicio	,CodProveedorServicio	,NombreProveedorServicio
		,Cantidad_TiposFacturacionHoteles,Valor_TiposFacturacionHoteles
		,acomodacion_nombre, tipoplan_nombre, tipohabitacion_nombre 
		,Licitacion_codigo ,Licitacion_nombre, ds_observacion
		,DocRelacionado
		,Anulada
		,Destino
		,Pais
		,Tipocliente
		,CantidadPax
		,BaseCom
		,PorcentajeCom
		,Usuario
		,Pais_Cliente
		,DivPol_cliente
		,Especialista
		,FAREBASIS
		,FarebasisReal
		,NumeroReembolso
	FROM (
		' + @QueryFacturas + '
		' + @QueryRemisiones + '
		' + @QueryCotizaciones + '
		' + @QueryNotasCredito + '
	) AS Facturacion
	' + @FiltroFinalOuterSQL + '
	ORDER BY  
		OrdenAerolinea ASC
		,Aerolinea ASC
		,factura ASC
		,Documento ASC
		,Servicio ASC
		,Clase ASC
		,Pasajero ASC
	'
	Exec (@SelectData)

	IF OBJECT_ID('tempdb..#TempFareBasis') IS NOT NULL DROP TABLE #TempFareBasis;
	IF OBJECT_ID('tempdb..#TempFarebasisReal') IS NOT NULL DROP TABLE #TempFarebasisReal;
	IF OBJECT_ID('tempdb..#TempIataOrigen') IS NOT NULL DROP TABLE #TempIataOrigen;
	IF OBJECT_ID('tempdb..#TempIataDestino') IS NOT NULL DROP TABLE #TempIataDestino;
	IF OBJECT_ID('tempdb..#TempIataItinerario') IS NOT NULL DROP TABLE #TempIataItinerario;
	IF OBJECT_ID('tempdb..#TempCiudadesExterior') IS NOT NULL DROP TABLE #TempCiudadesExterior;
	IF OBJECT_ID('tempdb..#TempCiudadesColombia') IS NOT NULL DROP TABLE #TempCiudadesColombia;
	
END