import { EvidenceSource } from "@prisma/client";
import { Type } from "class-transformer";
import { IsDate, IsEnum, IsOptional, IsString, IsUrl, IsUUID } from "class-validator";

export class CreateEvidenceDto {
  @IsUUID()
  investigationId!: string;

  @IsEnum(EvidenceSource)
  source!: EvidenceSource;

  @IsString()
  title!: string;

  @IsOptional()
  @IsUrl()
  url?: string;

  @Type(() => Date)
  @IsDate()
  capturedAt!: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  occurredAt?: Date;

  @IsOptional()
  @IsString()
  notes?: string;
}
