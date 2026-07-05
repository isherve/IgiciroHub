#!/usr/bin/env bash
set -o errexit
npm ci
npx expo export --platform web
ls -la dist/
