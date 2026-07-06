import { Redirect } from 'expo-router';
import React from 'react';

export default function Welcome() {
  return <Redirect href="/login" />;
}
