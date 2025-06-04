export async function GET() {
  return Response.json({ 
    message: 'API routes are working!',
    env: {
      hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
      hasAdminPassword: !!process.env.ADMIN_PASSWORD,
      nextAuthUrl: process.env.NEXTAUTH_URL
    }
  });
}