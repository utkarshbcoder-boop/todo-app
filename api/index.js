import app from '../server/server.js'

export default app

export const config = {
  api: { bodyParser: false },
  maxDuration: 30,
}
