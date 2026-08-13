# TrusonShopp Platform — Environment Variables Guide

## Overview

All configuration must be passed via environment variables. Never commit secrets to source control.

---

## Environment Variables Reference

| Variable Name         | Required | Default                 | Description                                            |
| --------------------- | -------- | ----------------------- | ------------------------------------------------------ |
| `NODE_ENV`            | Yes      | `development`           | Environment mode (`development`, `test`, `production`) |
| `PORT`                | Yes      | `5001`                  | Backend HTTP API listening port                        |
| `CLIENT_URL`          | Yes      | `http://localhost:5170` | Frontend client origin (used for CORS & Sockets)       |
| `MONGODB_URI`         | Yes      | —                       | MongoDB connection connection string                   |
| `REDIS_HOST`          | Yes      | `localhost`             | Redis server hostname                                  |
| `REDIS_PORT`          | Yes      | `6379`                  | Redis server port                                      |
| `JWT_ACCESS_SECRET`   | Yes      | —                       | Secret key for signing JWT access tokens               |
| `JWT_REFRESH_SECRET`  | Yes      | —                       | Secret key for signing JWT refresh tokens              |
| `PAYSTACK_SECRET_KEY` | No       | —                       | Paystack payment gateway integration secret key        |
| `STRIPE_SECRET_KEY`   | No       | —                       | Stripe payment gateway integration secret key          |
