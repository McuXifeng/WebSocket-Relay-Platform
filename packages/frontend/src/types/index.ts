/**
 * 前端类型定义
 *
 * 重新导出 shared 包中的类型，方便前端使用
 */

// 从 shared 包导入并重新导出类型
export type {
  User,
  UserPublic,
  UserRegisterRequest,
  UserLoginRequest,
  UserLoginResponse,
} from '@shared/types/user.types';

export type {
  InviteCode,
  InviteCodePublic,
  CreateInviteCodeRequest as InviteCodeCreateRequest,
  InviteCodeValidateResponse,
} from '@shared/types/invite-code.types';

export type {
  RegisterRequest,
  RegisterResponse,
  LoginRequest,
  LoginResponse,
  JwtPayload,
} from '@shared/types/auth.types';
