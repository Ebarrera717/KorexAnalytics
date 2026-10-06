-- ============================================================================
-- PROYECTO: KOREX ANALYTICS
-- OBJETO: Procedimientos Almacenados y Funciones del Sistema Interno
-- MOTOR: PostgreSQL (PL/pgSQL)
-- ============================================================================

-- 1. FUNCIÓN / PROCEDIMIENTO: spKAX_RegistrarInicioEjecucion
CREATE OR REPLACE FUNCTION public.spkax_registrarinicioejecucion(
    p_traceid VARCHAR(50),
    p_userid INT,
    p_username VARCHAR(150),
    p_profileid INT,
    p_serverhost VARCHAR(255),
    p_targetdatabase VARCHAR(150),
    p_procedureid INT,
    p_spname VARCHAR(255),
    p_parameterspayload TEXT
) RETURNS BIGINT AS $$
DECLARE
    v_newid BIGINT;
BEGIN
    INSERT INTO public."KAX_ExecutionRun" (
        "traceId",
        "userId",
        "userName",
        "profileId",
        "serverHost",
        "targetDatabase",
        "procedureId",
        "spName",
        "parametersPayload",
        "status",
        "recordsCount",
        "durationMs",
        "createdAt"
    )
    VALUES (
        p_traceid,
        p_userid,
        p_username,
        p_profileid,
        p_serverhost,
        p_targetdatabase,
        p_procedureid,
        p_spname,
        p_parameterspayload,
        'RUNNING',
        0,
        0,
        NOW()
    )
    RETURNING "id" INTO v_newid;

    RETURN v_newid;
END;
$$ LANGUAGE plpgsql;

-- 2. PROCEDIMIENTO: spKAX_FinalizarEjecucion
CREATE OR REPLACE PROCEDURE public.spkax_finalizarejecucion(
    p_traceid VARCHAR(50),
    p_status VARCHAR(30),
    p_recordscount INT,
    p_durationms INT,
    p_errormessage TEXT,
    p_errordetails TEXT
) AS $$
BEGIN
    UPDATE public."KAX_ExecutionRun"
    SET "status" = p_status,
        "recordsCount" = p_recordscount,
        "durationMs" = p_durationms,
        "errorMessage" = p_errormessage,
        "errorDetails" = p_errordetails,
        "finishedAt" = NOW()
    WHERE "traceId" = p_traceid;
END;
$$ LANGUAGE plpgsql;

-- 3. FUNCIÓN / PROCEDIMIENTO: spKAX_RegistrarAuditoria
CREATE OR REPLACE FUNCTION public.spkax_registrarauditoria(
    p_userid INT,
    p_username VARCHAR(150),
    p_module VARCHAR(50),
    p_action VARCHAR(100),
    p_ipaddress VARCHAR(45),
    p_useragent VARCHAR(255),
    p_details TEXT
) RETURNS BIGINT AS $$
DECLARE
    v_newid BIGINT;
BEGIN
    INSERT INTO public."KAX_SystemAuditLog" (
        "userId",
        "userName",
        "module",
        "action",
        "ipAddress",
        "userAgent",
        "details",
        "createdAt"
    )
    VALUES (
        p_userid,
        COALESCE(p_username, 'SYSTEM'),
        p_module,
        p_action,
        COALESCE(p_ipaddress, '127.0.0.1'),
        p_useragent,
        p_details,
        NOW()
    )
    RETURNING "id" INTO v_newid;

    RETURN v_newid;
END;
$$ LANGUAGE plpgsql;

-- 4. FUNCIÓN: spkax_dashboardguardar
CREATE OR REPLACE FUNCTION public.spkax_dashboardguardar(
    p_id INT,
    p_procedureid INT,
    p_userid INT,
    p_name VARCHAR(150),
    p_description VARCHAR(255),
    p_layoutconfig TEXT,
    p_widgetsconfig TEXT,
    p_isdefault BOOLEAN
) RETURNS INT AS $$
DECLARE
    v_saved_id INT;
BEGIN
    IF p_isdefault = TRUE THEN
        UPDATE public."KAX_Dashboard"
        SET "isDefault" = FALSE
        WHERE "procedureId" = p_procedureid AND "userId" = p_userid;
    END IF;

    IF p_id IS NOT NULL AND EXISTS (SELECT 1 FROM public."KAX_Dashboard" WHERE "id" = p_id) THEN
        UPDATE public."KAX_Dashboard"
        SET "name" = p_name,
            "description" = p_description,
            "layoutConfig" = p_layoutconfig,
            "widgetsConfig" = p_widgetsconfig,
            "isDefault" = COALESCE(p_isdefault, FALSE),
            "updatedAt" = NOW()
        WHERE "id" = p_id;

        v_saved_id := p_id;
    ELSE
        INSERT INTO public."KAX_Dashboard" (
            "procedureId", "userId", "name", "description",
            "layoutConfig", "widgetsConfig", "isDefault",
            "createdAt", "updatedAt"
        )
        VALUES (
            p_procedureid, p_userid, p_name, p_description,
            p_layoutconfig, p_widgetsconfig, COALESCE(p_isdefault, FALSE),
            NOW(), NOW()
        )
        RETURNING "id" INTO v_saved_id;
    END IF;

    RETURN v_saved_id;
END;
$$ LANGUAGE plpgsql;

-- 5. FUNCIÓN: spkax_dashboardlistar
CREATE OR REPLACE FUNCTION public.spkax_dashboardlistar(
    p_procedureid INT,
    p_userid INT DEFAULT NULL
) RETURNS TABLE (
    "id" INT,
    "procedureId" INT,
    "userId" INT,
    "userName" VARCHAR(150),
    "name" VARCHAR(150),
    "description" VARCHAR(255),
    "layoutConfig" TEXT,
    "widgetsConfig" TEXT,
    "isDefault" BOOLEAN,
    "createdAt" TIMESTAMPTZ,
    "updatedAt" TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        d."id",
        d."procedureId",
        d."userId",
        u."name"::VARCHAR(150) AS "userName",
        d."name",
        d."description",
        d."layoutConfig",
        d."widgetsConfig",
        d."isDefault",
        d."createdAt",
        d."updatedAt"
    FROM public."KAX_Dashboard" d
    LEFT JOIN public."KAX_User" u ON u."id" = d."userId"
    WHERE d."procedureId" = p_procedureid
      AND (p_userid IS NULL OR d."userId" = p_userid)
    ORDER BY d."isDefault" DESC, d."name" ASC;
END;
$$ LANGUAGE plpgsql;

-- 6. PROCEDIMIENTO: spkax_dashboardeliminar
CREATE OR REPLACE PROCEDURE public.spkax_dashboardeliminar(
    p_id INT,
    p_userid INT DEFAULT NULL
) AS $$
BEGIN
    DELETE FROM public."KAX_Dashboard"
    WHERE "id" = p_id
      AND (p_userid IS NULL OR "userId" = p_userid);
END;
$$ LANGUAGE plpgsql;
