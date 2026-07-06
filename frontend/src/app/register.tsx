import { Redirect, useLocalSearchParams } from 'expo-router';
import React from 'react';

/** Legacy route — landing page is now `/` with login + register. */
export default function Register() {
  const params = useLocalSearchParams<{ role?: string }>();
  const role = params.role === 'buyer' ? 'buyer' : 'cooperative';
  return <Redirect href={`/?auth=register&role=${role}`} />;
}
