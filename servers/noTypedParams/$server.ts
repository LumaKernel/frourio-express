/* eslint-disable */
import path from 'path'
import express, { Express, RequestHandler, Request } from 'express'
import multer, { Options } from 'multer'
import { validateOrReject, ValidatorOptions } from 'class-validator'
import * as Validators from './validators'
import hooksFn0 from './api/hooks'
import hooksFn1 from './api/users/hooks'
import controllerFn0, { hooks as ctrlHooksFn0 } from './api/controller'
import controllerFn1 from './api/empty/noEmpty/controller'
import controllerFn2 from './api/multiForm/controller'
import controllerFn3 from './api/texts/controller'
import controllerFn4 from './api/texts/sample/controller'
import controllerFn5, { hooks as ctrlHooksFn1 } from './api/users/controller'
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

const parseJSONBoby: RequestHandler = (req, res, next) => {
  express.json()(req, res, err => {
    if (err) return res.sendStatus(400)

    next()
  })
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

export default (app: Express, options: FrourioOptions = {}) => {
  const basePath = options.basePath ?? ''
  const validatorOptions: ValidatorOptions = { validationError: { target: false }, ...options.validator }
  const hooks0 = hooksFn0(app)
  const hooks1 = hooksFn1(app)
  const ctrlHooks0 = ctrlHooksFn0(app)
  const ctrlHooks1 = ctrlHooksFn1(app)
  const controller0 = controllerFn0(app)
  const controller1 = controllerFn1(app)
  const controller2 = controllerFn2(app)
  const controller3 = controllerFn3(app)
  const controller4 = controllerFn4(app)
  const controller5 = controllerFn5(app)
  const uploader = multer({ dest: path.join(__dirname, '.upload'), limits: { fileSize: 1024 ** 3 }, ...options.multer }).any()

  app.get(`${basePath}/`, [
    hooks0.onRequest,
    ctrlHooks0.onRequest,
    createValidateHandler(req => [
      Object.keys(req.query).length ? validateOrReject(Object.assign(new Validators.Query(), req.query), validatorOptions) : null
    ]),
    asyncMethodToHandler(controller0.get)
  ])

  app.post(`${basePath}/`, [
    hooks0.onRequest,
    ctrlHooks0.onRequest,
    uploader,
    formatMulterData([]),
    createValidateHandler(req => [
      validateOrReject(Object.assign(new Validators.Query(), req.query), validatorOptions),
      validateOrReject(Object.assign(new Validators.Body(), req.body), validatorOptions)
    ]),
    methodToHandler(controller0.post)
  ])

  app.get(`${basePath}/empty/noEmpty`, [
    hooks0.onRequest,
    methodToHandler(controller1.get)
  ])

  app.post(`${basePath}/multiForm`, [
    hooks0.onRequest,
    uploader,
    formatMulterData([['empty', false], ['vals', false], ['files', false]]),
    createValidateHandler(req => [
      validateOrReject(Object.assign(new Validators.MultiForm(), req.body), validatorOptions)
    ]),
    methodToHandler(controller2.post)
  ])

  app.get(`${basePath}/texts`, [
    hooks0.onRequest,
    methodToHandler(controller3.get)
  ])

  app.put(`${basePath}/texts`, [
    hooks0.onRequest,
    methodToHandler(controller3.put)
  ])

  app.put(`${basePath}/texts/sample`, [
    hooks0.onRequest,
    parseJSONBoby,
    methodToHandler(controller4.put)
  ])

  app.get(`${basePath}/users`, [
    hooks0.onRequest,
    hooks1.onRequest,
    ...ctrlHooks1.preHandler,
    asyncMethodToHandler(controller5.get)
  ])

  app.post(`${basePath}/users`, [
    hooks0.onRequest,
    hooks1.onRequest,
    parseJSONBoby,
    createValidateHandler(req => [
      validateOrReject(Object.assign(new Validators.UserInfo(), req.body), validatorOptions)
    ]),
    ...ctrlHooks1.preHandler,
    methodToHandler(controller5.post)
  ])

  return app
}
