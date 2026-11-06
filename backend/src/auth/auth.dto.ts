import { IsEmail, IsIn, IsOptional, IsString, MaxLength, MinLength } from "class-validator";
import { ROLES } from "../common/constants";

export class LoginDto {
  @IsEmail({}, { message: "Adresse e-mail invalide." })
  email: string;

  @IsString()
  @MinLength(1)
  password: string;
}

export class RegisterDto {
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name: string;

  @IsEmail({}, { message: "Adresse e-mail invalide." })
  email: string;

  @IsString()
  @MinLength(8, { message: "Le mot de passe doit contenir au moins 8 caractères." })
  @MaxLength(128)
  password: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  city?: string;

  @IsIn(ROLES)
  role: (typeof ROLES)[number];
}
