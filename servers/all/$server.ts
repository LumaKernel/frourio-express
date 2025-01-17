/* eslint-disable */
import path from 'path'
import express, { Express, RequestHandler, Request } from 'express'
import multer, { Options } from 'multer'
import { validateOrReject, ValidatorOptions } from 'class-validator'
import fastJson, { Schema } from 'fast-json-stringify'
import * as Validators from './validators'
import hooksFn0 from './api/hooks'
import hooksFn1 from './api/empty/hooks'
import hooksFn2 from './api/users/hooks'
import hooksFn3 from './api/users/_userId@number/_name/hooks'
import controllerFn0, { hooks as ctrlHooksFn0, responseSchema as responseSchemaFn0 } from './api/controller'
import controllerFn1 from './api/500/controller'
import controllerFn2 from './api/empty/noEmpty/controller'
import controllerFn3 from './api/multiForm/controller'
import controllerFn4 from './api/texts/controller'
import controllerFn5 from './api/texts/sample/controller'
import controllerFn6 from './api/texts/_label@string/controller'
import controllerFn7, { hooks as ctrlHooksFn1 } from './api/users/controller'
import controllerFn8 from './api/users/_userId@number/controller'
import controllerFn9 from './api/users/_userId@number/_name/controller'
import type { ReadStream } from 'fs'
import type { LowerHttpMethod, AspidaMethods, HttpStatusOk, AspidaMethodParams } from 'aspida'

export type FrourioOptions = {
  basePath?: string
  validator?: ValidatorOptions
  multer?: Options
}

export type MulterFile = Express.Multer.File

type HttpStatusNoOk = 301 | 302 | 400 | 401 | 402 | 403 | 404 | 405 | 406 | 409 | 500 | 501 | 502 | 503 | 504 | 505

type PartiallyPartial<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>

type BaseResponse<T, U, V> = {
  status: V extends number ? V : HttpStatusOk
  body: T
  headers: U
}

type ServerResponse<K extends AspidaMethodParams> =
  | (K extends { resBody: K['resBody']; resHeaders: K['resHeaders'] }
  ? BaseResponse<K['resBody'], K['resHeaders'], K['status']>
  : K extends { resBody: K['resBody'] }
  ? PartiallyPartial<BaseResponse<K['resBody'], K['resHeaders'], K['status']>, 'headers'>
  : K extends { resHeaders: K['resHeaders'] }
  ? PartiallyPartial<BaseResponse<K['resBody'], K['resHeaders'], K['status']>, 'body'>
  : PartiallyPartial<
      BaseResponse<K['resBody'], K['resHeaders'], K['status']>,
      'body' | 'headers'
    >)
  | PartiallyPartial<BaseResponse<any, any, HttpStatusNoOk>, 'body' | 'headers'>

type BlobToFile<T extends AspidaMethodParams> = T['reqFormat'] extends FormData
  ? {
      [P in keyof T['reqBody']]: Required<T['reqBody']>[P] extends Blob | ReadStream
        ? MulterFile
        : Required<T['reqBody']>[P] extends (Blob | ReadStream)[]
        ? MulterFile[]
        : T['reqBody'][P]
    }
  : T['reqBody']

type RequestParams<T extends AspidaMethodParams> = Pick<{
  query: T['query']
  body: BlobToFile<T>
  headers: T['reqHeaders']
}, {
  query: Required<T>['query'] extends {} | null ? 'query' : never
  body: Required<T>['reqBody'] extends {} | null ? 'body' : never
  headers: Required<T>['reqHeaders'] extends {} | null ? 'headers' : never
}['query' | 'body' | 'headers']>

export type ServerMethods<T extends AspidaMethods, U extends Record<string, any> = {}> = {
  [K in keyof T]: (
    req: RequestParams<T[K]> & U
  ) => ServerResponse<T[K]> | Promise<ServerResponse<T[K]>>
}

const parseNumberTypeQueryParams = (numberTypeParams: [string, boolean, boolean][]): RequestHandler => ({ query }, res, next) => {
  for (const [key, isOptional, isArray] of numberTypeParams) {
    const param = query[key]

    if (isArray) {
      if (!isOptional && param === undefined) {
        query[key] = []
      } else if (!isOptional || param !== undefined) {
        if (!Array.isArray(param)) return res.sendStatus(400)

        const vals = (param as string[]).map(Number)

        if (vals.some(isNaN)) return res.sendStatus(400)

        query[key] = vals as any
      }
    } else if (!isOptional || param !== undefined) {
      const val = Number(param)

      if (isNaN(val)) return res.sendStatus(400)

      query[key] = val as any
    }
  }

  next()
}

const parseBooleanTypeQueryParams = (booleanTypeParams: [string, boolean, boolean][]): RequestHandler => ({ query }, res, next) => {
  for (const [key, isOptional, isArray] of booleanTypeParams) {
    const param = query[key]

    if (isArray) {
      if (!isOptional && param === undefined) {
        query[key] = []
      } else if (!isOptional || param !== undefined) {
        if (!Array.isArray(param)) return res.sendStatus(400)

        const vals = (param as string[]).map(p => p === 'true' ? true : p === 'false' ? false : null)

        if (vals.some(v => v === null)) return res.sendStatus(400)

        query[key] = vals as any
      }
    } else if (!isOptional || param !== undefined) {
      const val = param === 'true' ? true : param === 'false' ? false : null

      if (val === null) return res.sendStatus(400)

      query[key] = val as any
    }
  }

  next()
}

const callParserIfExistsQuery = (parser: RequestHandler): RequestHandler => (req, res, next) =>
  Object.keys(req.query).length ? parser(req, res, next) : next()

const parseJSONBoby: RequestHandler = (req, res, next) => {
  express.json()(req, res, err => {
    if (err) return res.sendStatus(400)

    next()
  })
}

const createTypedParamsHandler = (numberTypeParams: string[]): RequestHandler => (req, res, next) => {
  const params: Record<string, string | number> = req.params

  for (const key of numberTypeParams) {
    const val = Number(params[key])

    if (isNaN(val)) return res.sendStatus(400)

    params[key] = val
  }

  next()
}

const createValidateHandler = (validators: (req: Request) => (Promise<void> | null)[]): RequestHandler =>
  (req, res, next) => Promise.all(validators(req)).then(() => next()).catch(err => res.status(400).send(err))

const formatMulterData = (arrayTypeKeys: [string, boolean][]): RequestHandler => ({ body, files }, _res, next) => {
  for (const [key] of arrayTypeKeys) {
    if (body[key] === undefined) body[key] = []
    else if (!Array.isArray(body[key])) {
      body[key] = [body[key]]
    }
  }

  for (const file of files as MulterFile[]) {
    if (Array.isArray(body[file.fieldname])) {
      body[file.fieldname].push(file)
    } else {
      body[file.fieldname] = file
    }
  }

  for (const [key, isOptional] of arrayTypeKeys) {
    if (!body[key].length && isOptional) delete body[key]
  }

  next()
}

const methodToHandler = (
  methodCallback: ServerMethods<any, any>[LowerHttpMethod]
): RequestHandler => (req, res, next) => {
  try {
    const data = methodCallback(req as any) as any

    if (data.headers) {
      for (const key in data.headers) {
        res.setHeader(key, data.headers[key])
      }
    }

    res.status(data.status).send(data.body)
  } catch (e) {
    next(e)
  }
}

const asyncMethodToHandler = (
  methodCallback: ServerMethods<any, any>[LowerHttpMethod]
): RequestHandler => async (req, res, next) => {
  try {
    const data = await methodCallback(req as any) as any

    if (data.headers) {
      for (const key in data.headers) {
        res.setHeader(key, data.headers[key])
      }
    }

    res.status(data.status).send(data.body)
  } catch (e) {
    next(e)
  }
}

const asyncMethodToHandlerWithSchema = (
  methodCallback: ServerMethods<any, any>[LowerHttpMethod],
  schema: { [K in HttpStatusOk]?: Schema }
): RequestHandler => {
  const stringifySet = Object.entries(schema).reduce(
    (prev, [key, val]) => ({ ...prev, [key]: fastJson(val!) }),
    {} as Record<HttpStatusOk, ReturnType<typeof fastJson> | undefined>
  )

  return async (req, res, next) => {
    try {
      const data = await methodCallback(req as any) as any
      const stringify = stringifySet[data.status as HttpStatusOk]

      if (stringify) {
        res.set('content-type', 'application/json; charset=utf-8')

        if (data.headers) {
          for (const key in data.headers) {
            res.setHeader(key, data.headers[key])
          }
        }

        res.status(data.status).send(stringify(data.body))
      } else {
        if (data.headers) {
          for (const key in data.headers) {
            res.setHeader(key, data.headers[key])
          }
        }

        res.status(data.status).send(data.body)
      }
    } catch (e) {
      next(e)
    }
  }
}

export default (app: Express, options: FrourioOptions = {}) => {
  const basePath = options.basePath ?? ''
  const validatorOptions: ValidatorOptions = { validationError: { target: false }, ...options.validator }
  const hooks0 = hooksFn0(app)
  const hooks1 = hooksFn1(app)
  const hooks2 = hooksFn2(app)
  const hooks3 = hooksFn3(app)
  const ctrlHooks0 = ctrlHooksFn0(app)
  const ctrlHooks1 = ctrlHooksFn1(app)
  const responseSchema0 = responseSchemaFn0()
  const controller0 = controllerFn0(app)
  const controller1 = controllerFn1(app)
  const controller2 = controllerFn2(app)
  const controller3 = controllerFn3(app)
  const controller4 = controllerFn4(app)
  const controller5 = controllerFn5(app)
  const controller6 = controllerFn6(app)
  const controller7 = controllerFn7(app)
  const controller8 = controllerFn8(app)
  const controller9 = controllerFn9(app)
  const uploader = multer({ dest: path.join(__dirname, '.upload'), limits: { fileSize: 1024 ** 3 }, ...options.multer }).any()

  app.get(`${basePath}/`, [
    ...hooks0.onRequest,
    ctrlHooks0.onRequest,
    hooks0.preParsing,
    callParserIfExistsQuery(parseNumberTypeQueryParams([['requiredNum', false, false], ['optionalNum', true, false], ['optionalNumArr', true, true], ['emptyNum', true, false], ['requiredNumArr', false, true]])),
    callParserIfExistsQuery(parseBooleanTypeQueryParams([['bool', false, false], ['optionalBool', true, false], ['boolArray', false, true], ['optionalBoolArray', true, true]])),
    createValidateHandler(req => [
      Object.keys(req.query).length ? validateOrReject(Object.assign(new Validators.Query(), req.query), validatorOptions) : null
    ]),
    asyncMethodToHandlerWithSchema(controller0.get, responseSchema0.get)
  ])

  app.post(`${basePath}/`, [
    ...hooks0.onRequest,
    ctrlHooks0.onRequest,
    hooks0.preParsing,
    parseNumberTypeQueryParams([['requiredNum', false, false], ['optionalNum', true, false], ['optionalNumArr', true, true], ['emptyNum', true, false], ['requiredNumArr', false, true]]),
    parseBooleanTypeQueryParams([['bool', false, false], ['optionalBool', true, false], ['boolArray', false, true], ['optionalBoolArray', true, true]]),
    uploader,
    formatMulterData([]),
    createValidateHandler(req => [
      validateOrReject(Object.assign(new Validators.Query(), req.query), validatorOptions),
      validateOrReject(Object.assign(new Validators.Body(), req.body), validatorOptions)
    ]),
    methodToHandler(controller0.post)
  ])

  app.get(`${basePath}/500`, [
    ...hooks0.onRequest,
    hooks0.preParsing,
    methodToHandler(controller1.get)
  ])

  app.get(`${basePath}/empty/noEmpty`, [
    ...hooks0.onRequest,
    ...hooks1.onRequest,
    hooks0.preParsing,
    hooks1.preParsing,
    asyncMethodToHandler(controller2.get)
  ])

  app.post(`${basePath}/multiForm`, [
    ...hooks0.onRequest,
    hooks0.preParsing,
    uploader,
    formatMulterData([['requiredArr', false], ['optionalArr', true], ['empty', true], ['vals', false], ['files', false]]),
    createValidateHandler(req => [
      validateOrReject(Object.assign(new Validators.MultiForm(), req.body), validatorOptions)
    ]),
    methodToHandler(controller3.post)
  ])

  app.get(`${basePath}/texts`, [
    ...hooks0.onRequest,
    hooks0.preParsing,
    callParserIfExistsQuery(parseNumberTypeQueryParams([['limit', true, false]])),
    methodToHandler(controller4.get)
  ])

  app.put(`${basePath}/texts`, [
    ...hooks0.onRequest,
    hooks0.preParsing,
    methodToHandler(controller4.put)
  ])

  app.put(`${basePath}/texts/sample`, [
    ...hooks0.onRequest,
    hooks0.preParsing,
    parseJSONBoby,
    methodToHandler(controller5.put)
  ])

  app.get(`${basePath}/texts/:label`, [
    ...hooks0.onRequest,
    hooks0.preParsing,
    methodToHandler(controller6.get)
  ])

  app.get(`${basePath}/users`, [
    ...hooks0.onRequest,
    hooks2.onRequest,
    hooks0.preParsing,
    ...ctrlHooks1.preHandler,
    asyncMethodToHandler(controller7.get)
  ])

  app.post(`${basePath}/users`, [
    ...hooks0.onRequest,
    hooks2.onRequest,
    hooks0.preParsing,
    parseJSONBoby,
    createValidateHandler(req => [
      validateOrReject(Object.assign(new Validators.UserInfo(), req.body), validatorOptions)
    ]),
    ...ctrlHooks1.preHandler,
    methodToHandler(controller7.post)
  ])

  app.get(`${basePath}/users/:userId`, [
    ...hooks0.onRequest,
    hooks2.onRequest,
    hooks0.preParsing,
    createTypedParamsHandler(['userId']),
    methodToHandler(controller8.get)
  ])

  app.get(`${basePath}/users/:userId/:name`, [
    ...hooks0.onRequest,
    hooks2.onRequest,
    hooks3.onRequest,
    hooks0.preParsing,
    createTypedParamsHandler(['userId']),
    methodToHandler(controller9.get)
  ])

  return app
}
