#!/bin/bash

# Vercel Ignored Build Step Script
# This script determines whether Vercel should build and deploy
# Returns exit code 1 to proceed with build, exit code 0 to cancel build

echo "🔍 Checking if deployment should proceed..."

# Get the current branch name
if [ "$VERCEL_GIT_COMMIT_REF" = "main" ]; then
  echo "✅ Branch is 'main' - proceeding with deployment"
  exit 1
else
  echo "⏭️  Branch is '$VERCEL_GIT_COMMIT_REF' - skipping deployment (only main branch deploys)"
  exit 0
fi 