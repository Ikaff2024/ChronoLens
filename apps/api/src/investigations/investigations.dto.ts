import { InvestigationStatus } from "@prisma/client";
import { IsArray, IsBoolean, IsEnum, IsOptional, IsString, MinLength } from "class-validator";

export class CreateInvestigationDto {
  @IsString()
  @MinLength(3)
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

export class UpdateInvestigationDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(InvestigationStatus)
  status?: InvestigationStatus;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

export class PurgeInvestigationDto {
  @IsString()
  confirmation!: string;

  @IsBoolean()
  exportAcknowledged!: boolean;
}
