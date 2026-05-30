export class PasswordResetRequestResultDto {
  userId!: string;
  email!: string;
  firstName!: string | null;
  lastName!: string | null;
  token!: string;
  expiresAt!: Date;
}
