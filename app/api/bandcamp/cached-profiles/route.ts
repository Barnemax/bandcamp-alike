import { getRecentProfiles, getAllProfiles, cacheDelete } from '@/app/lib/cache'

export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url)
  const all = searchParams.get('all') === '1'

  const profiles = all
    ? await getAllProfiles()
    : await getRecentProfiles(5)

  return Response.json(profiles)
}

export async function DELETE(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url)
  const fanId = searchParams.get('fanId')
  if (!fanId) return new Response('Missing fanId', { status: 400 })

  await cacheDelete(fanId)

  return new Response(null, { status: 204 })
}
