import { Redirect, useLocalSearchParams } from 'expo-router';
import React from 'react';

/** Legacy route — landing page is now `/` with login + register. */
export default function Login() {
  const params = useLocalSearchParams<{ role?: string }>();
  const role = params.role ? `&role=${params.role}` : '';
  return <Redirect href={`/?auth=login${role}`} />;
}
