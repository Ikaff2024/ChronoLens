import { EntityType } from "@prisma/client";
import { Type } from "class-transformer";
import { IsArray, IsDate, IsEnum, IsNumber, IsObject, IsOptional, IsString, IsUUID, Max, Min } from "class-validator";

export class CreateEntityDto {
  @IsUUID()
  investigationId!: string;

  @IsEnum(EntityType)
  type!: EntityType;

  @IsString()
  name!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  aliases?: string[];

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  confidence?: number;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  firstSeen?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  lastSeen?: Date;
}

export class ImportEntitiesCsvDto {
  @IsUUID()
  investigationId!: string;

  @IsString()
  csv!: string;
}
