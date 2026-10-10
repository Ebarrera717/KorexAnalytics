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

-- 7. FUNCIÓN: spkax_licenseconsultar
CREATE OR REPLACE FUNCTION public.spkax_licenseconsultar()
RETURNS TABLE (
    "id" INT,
    "clientName" VARCHAR(255),
    "nit" VARCHAR(50),
    "licenseKey" TEXT,
    "expirationDate" DATE,
    "issuedDate" DATE,
    "status" VARCHAR(50),
    "activatedAt" TIMESTAMPTZ,
    "updatedAt" TIMESTAMPTZ,
    "isExpired" BOOLEAN,
    "daysRemaining" INT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        l."id",
        l."clientName",
        l."nit",
        l."licenseKey",
        l."expirationDate",
        l."issuedDate",
        l."status",
        l."activatedAt",
        l."updatedAt",
        (l."expirationDate" < CURRENT_DATE) AS "isExpired",
        (l."expirationDate" - CURRENT_DATE)::INT AS "daysRemaining"
    FROM public."KAX_License" l
    ORDER BY l."id" DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- 8. FUNCIÓN: spkax_licenseaplicar
CREATE OR REPLACE FUNCTION public.spkax_licenseaplicar(
    p_clientname VARCHAR(255),
    p_nit VARCHAR(50),
    p_licensekey TEXT,
    p_expirationdate DATE,
    p_issueddate DATE DEFAULT NULL,
    p_status VARCHAR(50) DEFAULT 'ACTIVE'
) RETURNS INT AS $$
DECLARE
    v_saved_id INT;
BEGIN
    UPDATE public."KAX_License"
    SET "status" = 'INACTIVE', "updatedAt" = NOW()
    WHERE "status" = 'ACTIVE';

    INSERT INTO public."KAX_License" (
        "clientName", "nit", "licenseKey", "expirationDate",
        "issuedDate", "status", "activatedAt", "updatedAt"
    )
    VALUES (
        p_clientname, p_nit, p_licensekey, p_expirationdate,
        COALESCE(p_issueddate, CURRENT_DATE), p_status, NOW(), NOW()
    )
    RETURNING "id" INTO v_saved_id;

    RETURN v_saved_id;
END;
$$ LANGUAGE plpgsql;

-- 9. FUNCIÓN: spkax_userlistar
CREATE OR REPLACE FUNCTION public.spkax_userlistar(
    p_isactive BOOLEAN DEFAULT NULL
) RETURNS TABLE (
    "id" INT,
    "name" VARCHAR(150),
    "email" VARCHAR(255),
    "roleId" INT,
    "roleName" VARCHAR(100),
    "rolePermissions" JSONB,
    "isActive" BOOLEAN,
    "lastLoginAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ,
    "updatedAt" TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u."id",
        u."name",
        u."email",
        u."roleId",
        r."name" AS "roleName",
        r."permissions" AS "rolePermissions",
        u."isActive",
        u."lastLoginAt",
        u."createdAt",
        u."updatedAt"
    FROM public."KAX_User" u
    INNER JOIN public."KAX_Role" r ON r."id" = u."roleId"
    WHERE (p_isactive IS NULL OR u."isActive" = p_isactive)
    ORDER BY u."name" ASC;
END;
$$ LANGUAGE plpgsql;

-- 10. FUNCIÓN: spkax_userguardar
CREATE OR REPLACE FUNCTION public.spkax_userguardar(
    p_id INT,
    p_name VARCHAR(150),
    p_email VARCHAR(255),
    p_passwordhash VARCHAR(255),
    p_roleid INT,
    p_isactive BOOLEAN DEFAULT TRUE
) RETURNS INT AS $$
DECLARE
    v_saved_id INT;
BEGIN
    IF p_id IS NOT NULL AND EXISTS (SELECT 1 FROM public."KAX_User" WHERE "id" = p_id) THEN
        UPDATE public."KAX_User"
        SET "name" = p_name,
            "email" = p_email,
            "roleId" = p_roleid,
            "isActive" = p_isactive,
            "passwordHash" = CASE 
                WHEN p_passwordhash IS NOT NULL AND LENGTH(TRIM(p_passwordhash)) > 0 THEN p_passwordhash 
                ELSE "passwordHash" 
            END,
            "updatedAt" = NOW()
        WHERE "id" = p_id;

        v_saved_id := p_id;
    ELSE
        INSERT INTO public."KAX_User" (
            "name", "email", "passwordHash", "roleId", "isActive", "createdAt", "updatedAt"
        )
        VALUES (
            p_name, p_email, COALESCE(p_passwordhash, ''), p_roleid, p_isactive, NOW(), NOW()
        )
        RETURNING "id" INTO v_saved_id;
    END IF;

    RETURN v_saved_id;
END;
$$ LANGUAGE plpgsql;

-- 11. FUNCIÓN: spkax_rolelistar
CREATE OR REPLACE FUNCTION public.spkax_rolelistar(
    p_isactive BOOLEAN DEFAULT NULL
) RETURNS TABLE (
    "id" INT,
    "name" VARCHAR(100),
    "description" VARCHAR(255),
    "permissions" JSONB,
    "isActive" BOOLEAN,
    "createdAt" TIMESTAMPTZ,
    "updatedAt" TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        r."id",
        r."name",
        r."description",
        r."permissions",
        r."isActive",
        r."createdAt",
        r."updatedAt"
    FROM public."KAX_Role" r
    WHERE (p_isactive IS NULL OR r."isActive" = p_isactive)
    ORDER BY r."id" ASC;
END;
$$ LANGUAGE plpgsql;

-- 12. FUNCIÓN ESCALAR: fnkax_calcularfarebasisreal
CREATE OR REPLACE FUNCTION public.fnkax_calcularfarebasisreal(
    p_farebasisoriginal VARCHAR,
    p_startpos INT,
    p_length INT,
    p_separator VARCHAR DEFAULT '/'
)
RETURNS VARCHAR AS $$
DECLARE
    v_sep VARCHAR := COALESCE(NULLIF(p_separator, ''), '/');
    v_parts TEXT[];
    v_transformed TEXT[] := ARRAY[]::TEXT[];
    v_seg TEXT;
BEGIN
    IF p_farebasisoriginal IS NULL OR TRIM(p_farebasisoriginal) = '' THEN
        RETURN p_farebasisoriginal;
    END IF;

    IF p_startpos IS NULL OR p_startpos < 1 OR p_length IS NULL OR p_length <= 0 THEN
        RETURN p_farebasisoriginal;
    END IF;

    v_parts := string_to_array(p_farebasisoriginal, v_sep);
    FOREACH v_seg IN ARRAY v_parts LOOP
        v_transformed := array_append(v_transformed, substr(v_seg, p_startpos, p_length));
    END LOOP;

    RETURN array_to_string(v_transformed, v_sep);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 13. FUNCIÓN: spkax_farebasisrulelistar
CREATE OR REPLACE FUNCTION public.spkax_farebasisrulelistar(
    p_isactive BOOLEAN DEFAULT NULL,
    p_search VARCHAR DEFAULT NULL
)
RETURNS TABLE (
    "id" INT,
    "airlineCode" VARCHAR,
    "airlineName" VARCHAR,
    "startPos" INT,
    "length" INT,
    "separator" VARCHAR,
    "isActive" BOOLEAN,
    "createdAt" TIMESTAMPTZ,
    "updatedAt" TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        r."id",
        r."airlineCode",
        r."airlineName",
        r."startPos",
        r."length",
        r."separator",
        r."isActive",
        r."createdAt",
        r."updatedAt"
    FROM public."KAX_FareBasisRule" r
    WHERE (p_isactive IS NULL OR r."isActive" = p_isactive)
      AND (p_search IS NULL OR r."airlineCode" ILIKE '%' || p_search || '%' OR r."airlineName" ILIKE '%' || p_search || '%')
    ORDER BY r."airlineCode" ASC;
END;
$$ LANGUAGE plpgsql;

-- 14. FUNCIÓN: spkax_farebasisruleguardar
CREATE OR REPLACE FUNCTION public.spkax_farebasisruleguardar(
    p_id INT,
    p_airlinecode VARCHAR,
    p_airlinename VARCHAR,
    p_startpos INT DEFAULT 1,
    p_length INT DEFAULT 2,
    p_separator VARCHAR DEFAULT '/',
    p_isactive BOOLEAN DEFAULT TRUE
)
RETURNS INT AS $$
DECLARE
    v_saved_id INT;
    v_sep VARCHAR := COALESCE(NULLIF(TRIM(p_separator), ''), '/');
    v_start INT := CASE WHEN p_startpos < 1 THEN 1 ELSE p_startpos END;
    v_len INT := CASE WHEN p_length < 1 THEN 1 ELSE p_length END;
BEGIN
    IF p_id IS NOT NULL AND EXISTS (SELECT 1 FROM public."KAX_FareBasisRule" WHERE "id" = p_id) THEN
        UPDATE public."KAX_FareBasisRule"
        SET "airlineCode" = TRIM(p_airlinecode),
            "airlineName" = TRIM(p_airlinename),
            "startPos" = v_start,
            "length" = v_len,
            "separator" = v_sep,
            "isActive" = p_isactive,
            "updatedAt" = NOW()
        WHERE "id" = p_id;
        v_saved_id := p_id;
    ELSE
        IF EXISTS (SELECT 1 FROM public."KAX_FareBasisRule" WHERE "airlineCode" = TRIM(p_airlinecode)) THEN
            UPDATE public."KAX_FareBasisRule"
            SET "airlineName" = TRIM(p_airlinename),
                "startPos" = v_start,
                "length" = v_len,
                "separator" = v_sep,
                "isActive" = p_isactive,
                "updatedAt" = NOW()
            WHERE "airlineCode" = TRIM(p_airlinecode);
            SELECT "id" INTO v_saved_id FROM public."KAX_FareBasisRule" WHERE "airlineCode" = TRIM(p_airlinecode);
        ELSE
            INSERT INTO public."KAX_FareBasisRule" (
                "airlineCode", "airlineName", "startPos", "length", "separator", "isActive", "createdAt", "updatedAt"
            )
            VALUES (
                TRIM(p_airlinecode), TRIM(p_airlinename), v_start, v_len, v_sep, p_isactive, NOW(), NOW()
            )
            RETURNING "id" INTO v_saved_id;
        END IF;
    END IF;

    RETURN v_saved_id;
END;
$$ LANGUAGE plpgsql;

-- 15. PROCEDIMIENTO: spkax_farebasisruleeliminar
CREATE OR REPLACE PROCEDURE public.spkax_farebasisruleeliminar(
    p_id INT
) AS $$
BEGIN
    DELETE FROM public."KAX_FareBasisRule" WHERE "id" = p_id;
END;
$$ LANGUAGE plpgsql;


