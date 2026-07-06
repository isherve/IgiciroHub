import { Redirect } from 'expo-router';
import React from 'react';

/** Root URL — send visitors to the login screen. */
export default function Index() {
  return <Redirect href="/login" />;
}
