-- ==============================================================================
-- RLS POLICIES
-- Goal: Ensure isolated data access. Each user can only interact with their own data.
-- ==============================================================================

-- Remove policies in case this script is run multiple times
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can manage own students" ON public.students;
DROP POLICY IF EXISTS "Users can manage own lessons" ON public.lessons;
DROP POLICY IF EXISTS "Users can manage own closings" ON public.monthly_closings;
DROP POLICY IF EXISTS "Users can manage own payment info" ON public.payment_info;

-- ------------------------------------------------------------------------------
-- PROFILES
-- Note: 'id' in profiles references auth.users(id)
-- ------------------------------------------------------------------------------
CREATE POLICY "Users can view own profile" 
ON public.profiles FOR SELECT 
USING (id = auth.uid());

CREATE POLICY "Users can update own profile" 
ON public.profiles FOR UPDATE 
USING (id = auth.uid());

-- ------------------------------------------------------------------------------
-- STUDENTS
-- ------------------------------------------------------------------------------
CREATE POLICY "Users can manage own students" 
ON public.students FOR ALL 
USING (owner_id = auth.uid()) 
WITH CHECK (owner_id = auth.uid());

-- ------------------------------------------------------------------------------
-- LESSONS
-- ------------------------------------------------------------------------------
CREATE POLICY "Users can manage own lessons" 
ON public.lessons FOR ALL 
USING (owner_id = auth.uid()) 
WITH CHECK (owner_id = auth.uid());

-- ------------------------------------------------------------------------------
-- MONTHLY CLOSINGS
-- ------------------------------------------------------------------------------
CREATE POLICY "Users can manage own closings" 
ON public.monthly_closings FOR ALL 
USING (owner_id = auth.uid()) 
WITH CHECK (owner_id = auth.uid());

-- ------------------------------------------------------------------------------
-- PAYMENT INFO
-- ------------------------------------------------------------------------------
CREATE POLICY "Users can manage own payment info" 
ON public.payment_info FOR ALL 
USING (owner_id = auth.uid()) 
WITH CHECK (owner_id = auth.uid());
