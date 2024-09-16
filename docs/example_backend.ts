import axios from 'axios'
import { Hono } from 'hono'
import { JSONFilePreset } from 'lowdb/node'
import queryString from 'query-string';
import { readFileSync } from 'node:fs'
import jsonwebtoken from 'jsonwebtoken'
import { logger } from 'hono/logger'
import { cors } from 'hono/cors'

const app = new Hono()
app.use(logger())

const db = await JSONFilePreset('db.json', { users: [] as { id: string, email: string, first_name: string, last_name: string }[] })
let appleKeys = [] as { n: string, kid: string }[]

const getClientSecret = () => {

  const time = new Date().getTime() / 1000; // Current time in seconds since Epoch
  const privateKey = readFileSync(process.env.PRIVATE_KEY_FILE ?? '');

  console.log(privateKey)

  const headers = {
    kid: process.env.KEY_ID,
    typ: undefined,
    alg: 'ES256'
  }

  const claims = {
    'iss': process.env.TEAM_ID ?? '',
    'iat': time, // The time the token was generated
    'exp': time + 86400 * 180, // Token expiration date
    'aud': 'https://appleid.apple.com',
    'sub': process.env.SERVICE_ID ?? '',
  }

  const token = jsonwebtoken.sign(claims, privateKey, {
    algorithm: 'ES256',
    header: headers
  });

  return token
}

app.post('/login/callback', async (c) => {
  const body = (await c.req.formData())
  const clientSecret = getClientSecret()

  const userStr = body.get('user')

  console.log(userStr)
  console.log(process.env)
  console.log(c.req.queries())
  if (userStr) {
    if (typeof userStr != 'string') {
      console.error("Tried to upload file?")
      c.redirect('?success=false')
      return
    }

    const user = JSON.parse(userStr) as { name: { firstName: string, lastName: string }, email: string  }
    console.log(user)

    const requestBody = {
      grant_type: 'authorization_code',
      code: body.get('code'),
      redirect_uri: process.env.REDIRECT_URI,
      client_id: process.env.SERVICE_ID,
      client_secret: clientSecret,
      scope: process.env.SCOPE
    }

    console.log(requestBody)

    const appleRes = await axios.request({
      method: "POST",
      url: "https://appleid.apple.com/auth/token",
      data: queryString.stringify(requestBody),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    }).catch(function (error) {
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.log(error.response.data);
        console.log(error.response.status);
        console.log(error.response.headers);
      } else if (error.request) {
        // The request was made but no response was received
        // `error.request` is an instance of XMLHttpRequest in the browser 
        // and an instance of http.ClientRequest in node.js
        console.log(error.request);
      } else {
        // Something happened in setting up the request that triggered an Error
        console.log('Error', error.message);
      }
    })

    if (!appleRes) {
      return c.redirect('?success=false')
    }

    const appleData = appleRes.data as { access_token: string, refresh_token: string, id_token: string }
    const parsedJwt = jsonwebtoken.decode(appleData.id_token, { complete: true })
    if (!parsedJwt || typeof parsedJwt.payload === 'string' || !parsedJwt.payload.sub || typeof parsedJwt.payload.sub != 'string') {
      console.log(`no jwt?? JWT: ${parsedJwt} Data: ${JSON.stringify(appleData)}`)
      return c.redirect('?success=false')
    }

    await db.update(({ users }) => users.push({
      first_name: user.name.firstName,
      last_name: user.name.lastName,
      email: user.email,
      id: (parsedJwt.payload.sub as any) ?? ''
    }))

    return c.redirect(`?success=true&access_token=${appleData.access_token}&refresh_token=${appleData.refresh_token}&id_token=${appleData.id_token}`)
  }

  // firstName = '&first_name=' + user.name.firstName
  // lastName = '&last_name=' + user.name.lastName
  // email = '&email=' + user.email
  
  return c.redirect(`?success=true&code=${body.get('code')}&client_secret=${clientSecret}`)
})

// TODO: add a last fetch, if key is not found locally and last fetch was > 5 mins ago refetch
async function getApplePublicKey(kid: String) {
  if (appleKeys.length === 0) {
    const res = await axios.get('https://appleid.apple.com/auth/keys').catch(function (error) {
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.log(error.response.data);
        console.log(error.response.status);
        console.log(error.response.headers);
      } else if (error.request) {
        // The request was made but no response was received
        // `error.request` is an instance of XMLHttpRequest in the browser 
        // and an instance of http.ClientRequest in node.js
        console.log(error.request);
      } else {
        // Something happened in setting up the request that triggered an Error
        console.log('Error', error.message);
      }
    })

    if (!res) {
      return null
    }

    appleKeys = res.data.keys
  }

  return appleKeys.find(key => key.kid === kid)
}

app.use('/userdata', cors())
app.get('/userdata', async (c) => {
  let authHeader = c.req.header('Authorization')

  if (!authHeader) {
    return c.json({ error: 'No auth header' }, 401)
  }

  if (authHeader && authHeader.startsWith('Bearer ')) {
    authHeader = authHeader.substring(7)
  }

  const parsedJwt = jsonwebtoken.decode(authHeader, { complete: true })
  if (parsedJwt == null) {
    return c.json({ error: 'JWT is null?' }, 400)
  }

  if (!parsedJwt.header.kid) {
    return c.json({ error: 'No kid in JWT header' }, 403)
  }

  if (!parsedJwt.payload.sub) {
    return c.json({ error: 'No sub in JWT payload' }, 403)
  }

  const userId = typeof parsedJwt.payload.sub == 'string' ? parsedJwt.payload.sub : parsedJwt.payload.sub()

  const key = await getApplePublicKey(parsedJwt.header.kid)

  if (!key) {
    return c.json({ error: 'Cannot find apple public key' }, 500)
  }

  let pemKey: string | null = null
  try {
    pemKey = jwkToPem(key as any)
  } catch (e) {
    console.error('Cannot convert apple key', e)
    return c.json({ error: 'Cannot convert apple key', more_detailed: JSON.stringify(e) }, 500)
  }

  if (!pemKey) {
    return c.json({ error: 'Cannot find apple public PEM key' }, 500)
  }
  

  let verifyErr = null
  console.log(authHeader, key)
  jsonwebtoken.verify(authHeader, pemKey, function(err, decoded) {
    if (err) {
      verifyErr = { error: err }
    }
  });

  if (verifyErr != null) {
    return c.json(verifyErr, 500)
  }
  
  // User is legit :)
  const data = db.data.users.find(user => user.id === userId)
  if (!data) {
    return c.json({ error: 'cannot find user data for valid JWT' }, 500)
  }

  return c.json(data)
})

export default { 
  port: 3000, 
  fetch: app.fetch, 
} 