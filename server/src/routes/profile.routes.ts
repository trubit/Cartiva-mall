import { Router } from 'express'
import { authenticate } from '../middlewares/auth.middleware.js'
import { uploadAvatar as multerUpload } from '../middlewares/upload.middleware.js'
import { validate } from '../middlewares/validate.middleware.js'
import * as profileController from '../modules/profile/profile.controller.js'
import {
  updateProfileSchema,
  updateAddressSchema,
  updateNotificationsSchema,
  deleteAccountSchema,
} from '../../../src/shared/validators/profile.validators.js'

const router = Router()

router.use(authenticate)

router.get('/me', profileController.getMe)
router.put('/update', validate(updateProfileSchema), profileController.updateProfile)
router.put('/address', validate(updateAddressSchema), profileController.updateAddress)
router.put('/avatar', multerUpload, profileController.uploadAvatar)
router.put(
  '/notifications',
  validate(updateNotificationsSchema),
  profileController.updateNotifications,
)
router.delete('/delete-account', validate(deleteAccountSchema), profileController.deleteAccount)

export default router
