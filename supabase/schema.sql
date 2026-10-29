-- ==============================================================================
-- 1. EXTENSIONS
-- ==============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================================================
-- 2. TABLES
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- PROFILES (Linked to Supabase auth.users)
-- ------------------------------------------------------------------------------
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- STUDENTS
-- ------------------------------------------------------------------------------
CREATE TABLE public.students (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    hourly_rate NUMERIC(10,2) NOT NULL CHECK (hourly_rate >= 0),
    requires_invoice BOOLEAN DEFAULT false,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    notes TEXT,
    first_lesson_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_students_owner_id ON public.students(owner_id);
CREATE INDEX idx_students_status ON public.students(status);

-- ------------------------------------------------------------------------------
-- LESSONS
-- ------------------------------------------------------------------------------
CREATE TABLE public.lessons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    lesson_date DATE NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('standard', 'extended', 'absence', 'cancelled', 'courtesy')),
    multiplier NUMERIC(3,1) NOT NULL,
    charge_absence BOOLEAN DEFAULT true,
    content_notes TEXT,
    hourly_rate_snapshot NUMERIC(10,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_lessons_student_id ON public.lessons(student_id);
CREATE INDEX idx_lessons_date ON public.lessons(lesson_date);
CREATE INDEX idx_lessons_owner_date ON public.lessons(owner_id, lesson_date);

-- ------------------------------------------------------------------------------
-- MONTHLY CLOSINGS
-- ------------------------------------------------------------------------------
CREATE TABLE public.monthly_closings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
    total_lessons_count NUMERIC(10,1),
    total_revenue NUMERIC(12,2),
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed')),
    closed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure only one closing per month per owner
    CONSTRAINT unique_closing_per_month UNIQUE (owner_id, year, month)
);

-- ------------------------------------------------------------------------------
-- PAYMENT INFO
-- ------------------------------------------------------------------------------
CREATE TABLE public.payment_info (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    pix_key TEXT NOT NULL,
    pix_type TEXT CHECK (pix_type IN ('cpf', 'cnpj', 'email', 'phone', 'random')),
    bank_name TEXT,
    account_holder TEXT,
    is_default BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 3. ENABLE ROW LEVEL SECURITY (RLS) - Preparatório para a Fase 2
-- ==============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_closings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_info ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- 4. PROCEDURES & TRIGGERS DO CICLO DE VIDA DO ALUNO (Fase 3 - ADR 0006)
-- ==============================================================================

-- Sincronização periódica dos 90 dias sem aulas ou novos cadastros sem aulas
-- public.fn_sync_inactive_students(p_owner_id UUID) RETURNS INTEGER (ver supabase/functions.sql)

-- Reativação atômica BEFORE INSERT ON public.lessons
-- public.trg_reactivate_student_on_lesson (ver supabase/triggers.sql)

