#!/bin/bash
# Script to copy API routes and hooks to correct locations

echo "Copying API routes to web app..."

# Create directories if they don't exist
mkdir -p "../web/src/app/api/home/new-arrivals"
mkdir -p "../web/src/app/api/home/trending"
mkdir -p "../web/src/app/api/home/for-you"
mkdir -p "../web/src/hooks"

# Copy API routes
cp "new-arrivals-api.ts" "../web/src/app/api/home/new-arrivals/route.ts"
cp "trending-api.ts" "../web/src/app/api/home/trending/route.ts"
cp "for-you-api.ts" "../web/src/app/api/home/for-you/route.ts"

# Copy hooks
cp "useNewArrivals.ts" "../web/src/hooks/useNewArrivals.ts"
cp "useTrendingOutfits.ts" "../web/src/hooks/useTrendingOutfits.ts"
cp "useForYouOutfits.ts" "../web/src/hooks/useForYouOutfits.ts"

echo "Files copied successfully!"
echo ""
echo "Next steps:"
echo "1. Run the Supabase schema SQL in your Supabase dashboard"
echo "2. Update the homepage component to use the new hooks"
echo "3. Test the homepage with real data"
echo ""
echo "To run the SQL schema, copy the contents of supabase-homepage-schema.sql"
echo "and paste it in your Supabase SQL editor."