import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
const tags = ({ value }: { value: unknown }) =>
  Array.isArray(value) ? [...new Set(value.map((tag) => String(tag).trim().toLowerCase()).filter(Boolean))] : value;

export class CreateItemDto {
  @Transform(trim) @IsString() @MinLength(1) @MaxLength(120)
  name: string;

  @IsOptional() @Transform(trim) @IsString() @MaxLength(2000)
  description?: string;

  @Transform(trim) @IsString() @MinLength(1) @MaxLength(40)
  category: string;

  @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Max(1_000_000)
  price: number;

  @IsOptional() @Transform(tags) @IsArray() @ArrayMaxSize(10) @IsString({ each: true }) @MaxLength(30, { each: true })
  tags?: string[];

  @IsOptional() @IsBoolean()
  inStock?: boolean;
}

export class UpdateItemDto {
  @IsOptional() @Transform(trim) @IsString() @MinLength(1) @MaxLength(120)
  name?: string;

  @IsOptional() @Transform(trim) @IsString() @MaxLength(2000)
  description?: string;

  @IsOptional() @Transform(trim) @IsString() @MinLength(1) @MaxLength(40)
  category?: string;

  @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Max(1_000_000)
  price?: number;

  @IsOptional() @Transform(tags) @IsArray() @ArrayMaxSize(10) @IsString({ each: true }) @MaxLength(30, { each: true })
  tags?: string[];

  @IsOptional() @IsBoolean()
  inStock?: boolean;
}

export class ListItemsQuery {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)
  limit = 24;

  @IsOptional() @IsString() @MaxLength(40)
  cursor?: string;

  @IsOptional() @IsString() @MaxLength(40)
  category?: string;
}
