// Shared TypeScript types

// User types
export type {
  User,
  UserPublic,
  UserRegisterRequest,
  UserLoginRequest,
  UserLoginResponse,
  UserListItem,
  GetUsersResponse,
} from './user.types';

// InviteCode types
export type {
  InviteCode,
  InviteCodePublic,
  CreateInviteCodeRequest,
  CreateInviteCodeResponse,
  InviteCodeValidateResponse,
  InviteCodeListItem,
  GetInviteCodesResponse,
} from './invite-code.types';

// Auth types
export type {
  RegisterRequest,
  RegisterResponse,
  LoginRequest,
  LoginResponse,
  JwtPayload,
} from './auth.types';

// Endpoint types
export type {
  Endpoint,
  EndpointWithUrl,
  CreateEndpointRequest,
  CreateEndpointResponse,
  GetEndpointsResponse,
  EndpointStatsResponse,
} from './endpoint.types';
export { ForwardingMode } from './endpoint.types';

// Message types
export type { Message, GetMessagesResponse } from './message.types';

// Device types
export type {
  Device,
  GetDevicesResponse,
  UpdateDeviceNameRequest,
  IdentifyMessage,
  IdentifiedMessage,
} from './device.types';
