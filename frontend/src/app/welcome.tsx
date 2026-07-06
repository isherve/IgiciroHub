import { Redirect } from 'expo-router';
import React from 'react';

/** Legacy route — landing page is now `/` with login + register. */
export default function Welcome() {
  return <Redirect href="/" />;
}
