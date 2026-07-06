import { Redirect, useLocalSearchParams } from 'expo-router';
import React from 'react';

/** Sign-up deep link — opens login landing on the register tab. */
export default function Register() {
  const params = useLocalSearchParams<{ role?: string }>();
  const role = params.role === 'buyer' ? 'buyer' : 'cooperative';
  return <Redirect href={`/login?auth=register&role=${role}`} />;
}
