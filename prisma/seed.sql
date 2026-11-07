-- MERUNO synthetic master/demo catalog seed.
-- Idempotent: safe to re-run after the initial migration.
-- Does NOT create patient records or any real personal/medical data.
BEGIN;

-- 7 specialties.
INSERT INTO "Specialty" ("id", "code", "name", "description", "sortOrder", "isActive", "createdAt", "updatedAt") VALUES
('seed_spec_internal_medicine', 'INTERNAL_MEDICINE', 'Internal Medicine', 'Adult primary and chronic care.', 1, TRUE, NOW(), NOW()),
('seed_spec_pediatrics', 'PEDIATRICS', 'Pediatrics', 'Medical care for infants, children, and adolescents.', 2, TRUE, NOW(), NOW()),
('seed_spec_cardiology', 'CARDIOLOGY', 'Cardiology', 'Heart and cardiovascular care.', 3, TRUE, NOW(), NOW()),
('seed_spec_orthopedics', 'ORTHOPEDICS', 'Orthopedics', 'Bone, joint, and musculoskeletal care.', 4, TRUE, NOW(), NOW()),
('seed_spec_dermatology', 'DERMATOLOGY', 'Dermatology', 'Skin, hair, and nail care.', 5, TRUE, NOW(), NOW()),
('seed_spec_obgyn', 'OBSTETRICS_GYNECOLOGY', 'Obstetrics & Gynecology', 'Women’s health and maternity care.', 6, TRUE, NOW(), NOW()),
('seed_spec_ent', 'ENT', 'Ear, Nose & Throat (ENT)', 'Ear, nose, and throat care.', 7, TRUE, NOW(), NOW())
ON CONFLICT ("code") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description", "sortOrder" = EXCLUDED."sortOrder", "isActive" = EXCLUDED."isActive", "updatedAt" = NOW();

-- 8 synthetic doctor employees. No login accounts are created in Phase 2E.
INSERT INTO "Employee" ("id", "employeeNumber", "firstName", "lastName", "workEmail", "status", "hiredOn", "createdAt", "updatedAt") VALUES
('seed_emp_dr_001', 'MER-DR-001', 'Omar', 'Hassan', 'dr.omar.hassan@meruno.example', 'ACTIVE', DATE '2024-01-01', NOW(), NOW()),
('seed_emp_dr_002', 'MER-DR-002', 'Lina', 'Ahmed', 'dr.lina.ahmed@meruno.example', 'ACTIVE', DATE '2024-01-01', NOW(), NOW()),
('seed_emp_dr_003', 'MER-DR-003', 'Sara', 'Mahmoud', 'dr.sara.mahmoud@meruno.example', 'ACTIVE', DATE '2024-01-01', NOW(), NOW()),
('seed_emp_dr_004', 'MER-DR-004', 'Karim', 'Adel', 'dr.karim.adel@meruno.example', 'ACTIVE', DATE '2024-01-01', NOW(), NOW()),
('seed_emp_dr_005', 'MER-DR-005', 'Youssef', 'Nabil', 'dr.youssef.nabil@meruno.example', 'ACTIVE', DATE '2024-01-01', NOW(), NOW()),
('seed_emp_dr_006', 'MER-DR-006', 'Mariam', 'Fathy', 'dr.mariam.fathy@meruno.example', 'ACTIVE', DATE '2024-01-01', NOW(), NOW()),
('seed_emp_dr_007', 'MER-DR-007', 'Nour', 'Khaled', 'dr.nour.khaled@meruno.example', 'ACTIVE', DATE '2024-01-01', NOW(), NOW()),
('seed_emp_dr_008', 'MER-DR-008', 'Adam', 'Samir', 'dr.adam.samir@meruno.example', 'ACTIVE', DATE '2024-01-01', NOW(), NOW())
ON CONFLICT ("employeeNumber") DO UPDATE SET "firstName" = EXCLUDED."firstName", "lastName" = EXCLUDED."lastName", "workEmail" = EXCLUDED."workEmail", "status" = EXCLUDED."status", "updatedAt" = NOW();

INSERT INTO "DoctorProfile" ("id", "employeeId", "professionalTitle", "publicDisplayName", "publicBio", "yearsOfExperience", "isBookable", "isPubliclyVisible", "createdAt", "updatedAt")
SELECT 'seed_doctor_' || e."employeeNumber", e."id", 'Consultant', 'Dr. ' || e."firstName" || ' ' || e."lastName", 'Synthetic MERUNO portfolio doctor profile.', CASE e."employeeNumber" WHEN 'MER-DR-001' THEN 14 WHEN 'MER-DR-002' THEN 11 WHEN 'MER-DR-003' THEN 9 WHEN 'MER-DR-004' THEN 13 WHEN 'MER-DR-005' THEN 12 WHEN 'MER-DR-006' THEN 8 WHEN 'MER-DR-007' THEN 10 ELSE 7 END, TRUE, TRUE, NOW(), NOW()
FROM "Employee" e WHERE e."employeeNumber" IN ('MER-DR-001','MER-DR-002','MER-DR-003','MER-DR-004','MER-DR-005','MER-DR-006','MER-DR-007','MER-DR-008')
ON CONFLICT ("employeeId") DO UPDATE SET "professionalTitle" = EXCLUDED."professionalTitle", "publicDisplayName" = EXCLUDED."publicDisplayName", "publicBio" = EXCLUDED."publicBio", "yearsOfExperience" = EXCLUDED."yearsOfExperience", "isBookable" = TRUE, "isPubliclyVisible" = TRUE, "updatedAt" = NOW();

WITH mapping(employee_number, specialty_code, is_primary) AS (VALUES
('MER-DR-001', 'INTERNAL_MEDICINE', TRUE),
('MER-DR-002', 'INTERNAL_MEDICINE', TRUE),
('MER-DR-003', 'PEDIATRICS', TRUE),
('MER-DR-004', 'CARDIOLOGY', TRUE),
('MER-DR-005', 'ORTHOPEDICS', TRUE),
('MER-DR-006', 'DERMATOLOGY', TRUE),
('MER-DR-007', 'OBSTETRICS_GYNECOLOGY', TRUE),
('MER-DR-008', 'ENT', TRUE)
)
INSERT INTO "DoctorSpecialty" ("doctorId", "specialtyId", "isPrimary")
SELECT dp."id", s."id", m.is_primary
FROM mapping m
JOIN "Employee" e ON e."employeeNumber" = m.employee_number
JOIN "DoctorProfile" dp ON dp."employeeId" = e."id"
JOIN "Specialty" s ON s."code" = m.specialty_code
ON CONFLICT ("doctorId", "specialtyId") DO UPDATE SET "isPrimary" = EXCLUDED."isPrimary";

-- Public-facing service catalog and each doctor's synthetic prices.
INSERT INTO "ServiceCatalog" ("id", "code", "name", "type", "description", "isActive", "createdAt", "updatedAt") VALUES
('seed_service_consultation', 'CONSULTATION', 'Medical Consultation', 'CONSULTATION', 'Standard outpatient consultation.', TRUE, NOW(), NOW()),
('seed_service_follow_up', 'FOLLOW_UP', 'Follow-up Visit', 'FOLLOW_UP', 'Follow-up outpatient visit.', TRUE, NOW(), NOW())
ON CONFLICT ("code") DO UPDATE SET "name" = EXCLUDED."name", "type" = EXCLUDED."type", "description" = EXCLUDED."description", "isActive" = TRUE, "updatedAt" = NOW();

INSERT INTO "DoctorService" ("id", "doctorId", "serviceId", "durationMinutes", "price", "currencyCode", "isActive", "createdAt", "updatedAt")
SELECT 'seed_ds_' || dp."id" || '_' || sc."code", dp."id", sc."id",
       CASE sc."code" WHEN 'CONSULTATION' THEN 30 ELSE 20 END,
       CASE e."employeeNumber" WHEN 'MER-DR-001' THEN (CASE sc."code" WHEN 'CONSULTATION' THEN 500 ELSE 350 END)
            WHEN 'MER-DR-002' THEN (CASE sc."code" WHEN 'CONSULTATION' THEN 450 ELSE 300 END)
            WHEN 'MER-DR-003' THEN (CASE sc."code" WHEN 'CONSULTATION' THEN 450 ELSE 300 END)
            WHEN 'MER-DR-004' THEN (CASE sc."code" WHEN 'CONSULTATION' THEN 600 ELSE 400 END)
            WHEN 'MER-DR-005' THEN (CASE sc."code" WHEN 'CONSULTATION' THEN 550 ELSE 375 END)
            WHEN 'MER-DR-006' THEN (CASE sc."code" WHEN 'CONSULTATION' THEN 500 ELSE 350 END)
            WHEN 'MER-DR-007' THEN (CASE sc."code" WHEN 'CONSULTATION' THEN 600 ELSE 400 END)
            ELSE (CASE sc."code" WHEN 'CONSULTATION' THEN 450 ELSE 300 END) END,
       'EGP', TRUE, NOW(), NOW()
FROM "DoctorProfile" dp
JOIN "Employee" e ON e."id" = dp."employeeId"
CROSS JOIN "ServiceCatalog" sc
WHERE e."employeeNumber" LIKE 'MER-DR-%' AND sc."code" IN ('CONSULTATION','FOLLOW_UP')
ON CONFLICT ("doctorId", "serviceId") DO UPDATE SET "durationMinutes" = EXCLUDED."durationMinutes", "price" = EXCLUDED."price", "currencyCode" = EXCLUDED."currencyCode", "isActive" = TRUE, "updatedAt" = NOW();

-- Synthetic laboratory catalog.
INSERT INTO "LabTest" ("id", "code", "name", "description", "specimenType", "defaultTurnaroundMinutes", "requiresFasting", "preparationInstructions", "price", "currencyCode", "isActive", "createdAt", "updatedAt") VALUES
('seed_lab_cbc', 'CBC', 'Complete Blood Count', 'Synthetic demo test catalog entry.', 'EDTA blood', 180, FALSE, NULL, 300, 'EGP', TRUE, NOW(), NOW()),
('seed_lab_fbs', 'FBS', 'Fasting Blood Glucose', 'Synthetic demo test catalog entry.', 'Serum or plasma', 120, TRUE, 'Fasting instructions are confirmed by clinic staff.', 150, 'EGP', TRUE, NOW(), NOW()),
('seed_lab_hba1c', 'HBA1C', 'HbA1c', 'Synthetic demo test catalog entry.', 'EDTA blood', 180, FALSE, NULL, 250, 'EGP', TRUE, NOW(), NOW()),
('seed_lab_lipid', 'LIPID_PROFILE', 'Lipid Profile', 'Synthetic demo test catalog entry.', 'Serum', 240, TRUE, 'Fasting instructions are confirmed by clinic staff.', 350, 'EGP', TRUE, NOW(), NOW()),
('seed_lab_tsh', 'TSH', 'Thyroid Stimulating Hormone', 'Synthetic demo test catalog entry.', 'Serum', 240, FALSE, NULL, 300, 'EGP', TRUE, NOW(), NOW()),
('seed_lab_lft', 'LFT', 'Liver Function Panel', 'Synthetic demo test catalog entry.', 'Serum', 240, FALSE, NULL, 400, 'EGP', TRUE, NOW(), NOW()),
('seed_lab_kft', 'KFT', 'Kidney Function Panel', 'Synthetic demo test catalog entry.', 'Serum', 240, FALSE, NULL, 400, 'EGP', TRUE, NOW(), NOW()),
('seed_lab_urine', 'URINALYSIS', 'Urinalysis', 'Synthetic demo test catalog entry.', 'Urine', 120, FALSE, 'Use a clean collection container.', 150, 'EGP', TRUE, NOW(), NOW())
ON CONFLICT ("code") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description", "specimenType" = EXCLUDED."specimenType", "defaultTurnaroundMinutes" = EXCLUDED."defaultTurnaroundMinutes", "requiresFasting" = EXCLUDED."requiresFasting", "preparationInstructions" = EXCLUDED."preparationInstructions", "price" = EXCLUDED."price", "currencyCode" = EXCLUDED."currencyCode", "isActive" = TRUE, "updatedAt" = NOW();

WITH components(test_code, code, name, value_type, unit, sort_order) AS (VALUES
('CBC','WBC','White Blood Cells','NUMERIC','10^9/L',1),
('CBC','RBC','Red Blood Cells','NUMERIC','10^12/L',2),
('CBC','HGB','Hemoglobin','NUMERIC','g/dL',3),
('CBC','HCT','Hematocrit','NUMERIC','%',4),
('CBC','PLT','Platelets','NUMERIC','10^9/L',5),
('FBS','GLUCOSE','Glucose','NUMERIC','mg/dL',1),
('HBA1C','HBA1C','HbA1c','NUMERIC','%',1),
('LIPID_PROFILE','TOTAL_CHOLESTEROL','Total Cholesterol','NUMERIC','mg/dL',1),
('LIPID_PROFILE','HDL','HDL Cholesterol','NUMERIC','mg/dL',2),
('LIPID_PROFILE','LDL','LDL Cholesterol','NUMERIC','mg/dL',3),
('LIPID_PROFILE','TRIGLYCERIDES','Triglycerides','NUMERIC','mg/dL',4),
('TSH','TSH','TSH','NUMERIC','mIU/L',1)
)
INSERT INTO "LabTestComponent" ("id", "labTestId", "code", "name", "valueType", "defaultUnit", "sortOrder", "isActive")
SELECT 'seed_ltc_' || lt."code" || '_' || c.code, lt."id", c.code, c.name, c.value_type::"LabResultValueType", c.unit, c.sort_order, TRUE
FROM components c JOIN "LabTest" lt ON lt."code" = c.test_code
ON CONFLICT ("labTestId", "code") DO UPDATE SET "name" = EXCLUDED."name", "valueType" = EXCLUDED."valueType", "defaultUnit" = EXCLUDED."defaultUnit", "sortOrder" = EXCLUDED."sortOrder", "isActive" = TRUE;

-- Demonstration-only catalog labels; code system is explicitly marked DEMO, not a clinical coding standard.
INSERT INTO "DiagnosisCatalog" ("id", "code", "codeSystem", "displayName", "description", "isActive", "createdAt", "updatedAt") VALUES
('seed_dx_demo_001', 'DEMO-DX-001', 'MERUNO-DEMO', 'Essential hypertension (demo label)', 'Demonstration catalog entry; not a coding authority.', TRUE, NOW(), NOW()),
('seed_dx_demo_002', 'DEMO-DX-002', 'MERUNO-DEMO', 'Type 2 diabetes mellitus (demo label)', 'Demonstration catalog entry; not a coding authority.', TRUE, NOW(), NOW()),
('seed_dx_demo_003', 'DEMO-DX-003', 'MERUNO-DEMO', 'Acute upper respiratory infection (demo label)', 'Demonstration catalog entry; not a coding authority.', TRUE, NOW(), NOW()),
('seed_dx_demo_004', 'DEMO-DX-004', 'MERUNO-DEMO', 'Gastro-esophageal reflux (demo label)', 'Demonstration catalog entry; not a coding authority.', TRUE, NOW(), NOW()),
('seed_dx_demo_005', 'DEMO-DX-005', 'MERUNO-DEMO', 'Iron deficiency anemia (demo label)', 'Demonstration catalog entry; not a coding authority.', TRUE, NOW(), NOW()),
('seed_dx_demo_006', 'DEMO-DX-006', 'MERUNO-DEMO', 'Low back pain (demo label)', 'Demonstration catalog entry; not a coding authority.', TRUE, NOW(), NOW())
ON CONFLICT ("code") DO UPDATE SET "codeSystem" = EXCLUDED."codeSystem", "displayName" = EXCLUDED."displayName", "description" = EXCLUDED."description", "isActive" = TRUE, "updatedAt" = NOW();

-- X-ray and ultrasound only, matching the agreed clinic scope.
INSERT INTO "RadiologyProcedure" ("id", "code", "name", "modality", "description", "defaultDurationMinutes", "price", "currencyCode", "preparationInstructions", "isActive", "createdAt", "updatedAt") VALUES
('seed_rad_xray_chest_pa', 'XR-CHEST-PA', 'Chest X-ray (PA)', 'DIGITAL_XRAY', 'Synthetic demo radiology catalog entry.', 15, 350, 'EGP', 'Verify patient identity and apply the clinic pregnancy-screening workflow where applicable.', TRUE, NOW(), NOW()),
('seed_rad_xray_hand', 'XR-HAND-2V', 'Hand X-ray (2 views)', 'DIGITAL_XRAY', 'Synthetic demo radiology catalog entry.', 15, 400, 'EGP', 'Verify patient identity and apply the clinic pregnancy-screening workflow where applicable.', TRUE, NOW(), NOW()),
('seed_rad_us_abdomen', 'US-ABDOMEN', 'Abdominal Ultrasound', 'ULTRASOUND', 'Synthetic demo radiology catalog entry.', 30, 650, 'EGP', 'Follow the clinic preparation instructions for the scheduled exam.', TRUE, NOW(), NOW()),
('seed_rad_us_pelvic', 'US-PELVIC', 'Pelvic Ultrasound', 'ULTRASOUND', 'Synthetic demo radiology catalog entry.', 30, 600, 'EGP', 'Follow the clinic preparation instructions for the scheduled exam.', TRUE, NOW(), NOW())
ON CONFLICT ("code") DO UPDATE SET "name" = EXCLUDED."name", "modality" = EXCLUDED."modality", "description" = EXCLUDED."description", "defaultDurationMinutes" = EXCLUDED."defaultDurationMinutes", "price" = EXCLUDED."price", "currencyCode" = EXCLUDED."currencyCode", "preparationInstructions" = EXCLUDED."preparationInstructions", "isActive" = TRUE, "updatedAt" = NOW();

INSERT INTO "RadiologyResource" ("id", "code", "name", "modality", "location", "isActive", "createdAt", "updatedAt") VALUES
('seed_rad_resource_xray_01', 'XR-ROOM-01', 'Digital X-ray Room 01', 'DIGITAL_XRAY', 'Radiology Department', TRUE, NOW(), NOW()),
('seed_rad_resource_us_01', 'US-ROOM-01', 'Ultrasound Room 01', 'ULTRASOUND', 'Radiology Department', TRUE, NOW(), NOW())
ON CONFLICT ("code") DO UPDATE SET "name" = EXCLUDED."name", "modality" = EXCLUDED."modality", "location" = EXCLUDED."location", "isActive" = TRUE, "updatedAt" = NOW();

COMMIT;
