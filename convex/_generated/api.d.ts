/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as analytics from "../analytics.js";
import type * as auth from "../auth.js";
import type * as authHelpers from "../authHelpers.js";
import type * as crons from "../crons.js";
import type * as financialAnalytics from "../financialAnalytics.js";
import type * as fssaiVerification from "../fssaiVerification.js";
import type * as groupOrders from "../groupOrders.js";
import type * as imageAnalysis from "../imageAnalysis.js";
import type * as inventory from "../inventory.js";
import type * as marketIntelligence from "../marketIntelligence.js";
import type * as messages from "../messages.js";
import type * as negotiations from "../negotiations.js";
import type * as notifications from "../notifications.js";
import type * as orderTracking from "../orderTracking.js";
import type * as orders from "../orders.js";
import type * as priceAlerts from "../priceAlerts.js";
import type * as ratings from "../ratings.js";
import type * as recipes from "../recipes.js";
import type * as recommendations from "../recommendations.js";
import type * as requests from "../requests.js";
import type * as sampleData from "../sampleData.js";
import type * as sampleSuppliers from "../sampleSuppliers.js";
import type * as suppliers from "../suppliers.js";
import type * as support from "../support.js";
import type * as test from "../test.js";
import type * as vendors from "../vendors.js";
import type * as voiceQuery from "../voiceQuery.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  analytics: typeof analytics;
  auth: typeof auth;
  authHelpers: typeof authHelpers;
  crons: typeof crons;
  financialAnalytics: typeof financialAnalytics;
  fssaiVerification: typeof fssaiVerification;
  groupOrders: typeof groupOrders;
  imageAnalysis: typeof imageAnalysis;
  inventory: typeof inventory;
  marketIntelligence: typeof marketIntelligence;
  messages: typeof messages;
  negotiations: typeof negotiations;
  notifications: typeof notifications;
  orderTracking: typeof orderTracking;
  orders: typeof orders;
  priceAlerts: typeof priceAlerts;
  ratings: typeof ratings;
  recipes: typeof recipes;
  recommendations: typeof recommendations;
  requests: typeof requests;
  sampleData: typeof sampleData;
  sampleSuppliers: typeof sampleSuppliers;
  suppliers: typeof suppliers;
  support: typeof support;
  test: typeof test;
  vendors: typeof vendors;
  voiceQuery: typeof voiceQuery;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
