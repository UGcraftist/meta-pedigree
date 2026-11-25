import { describe, expect, it } from 'vitest';
import { supabase } from './supabase';

// T-022: the client validates VITE_SUPABASE_* at import time. This test makes
// web/.env.test mandatory for a credential-free checkout, so the CI guard cannot
// silently regress into "passes locally because web/.env.local exists".
describe('supabase client', () => {
  it('constructs from the non-secret placeholders in web/.env.test', () => {
    expect(supabase).toBeTruthy();
  });
});
