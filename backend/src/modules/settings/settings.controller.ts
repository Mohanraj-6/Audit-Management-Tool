import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('settings')
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all settings' })
  async findAll() {
    return this.settingsService.findAll();
  }

  @Get('public')
  @ApiOperation({ summary: 'Get public settings (company name, logo, etc.)' })
  async findPublic() {
    return this.settingsService.findPublic();
  }

  @Get(':key')
  @ApiOperation({ summary: 'Get a setting by key' })
  async findOne(@Param('key') key: string) {
    return this.settingsService.findByKey(key);
  }

  @Post()
  @ApiOperation({ summary: 'Create a setting' })
  async create(@Body() body: any) {
    return this.settingsService.create(body);
  }

  @Patch(':key')
  @ApiOperation({ summary: 'Update a setting' })
  async update(@Param('key') key: string, @Body() body: any) {
    return this.settingsService.update(key, body.value);
  }

  @Delete(':key')
  @ApiOperation({ summary: 'Delete a setting' })
  async remove(@Param('key') key: string) {
    await this.settingsService.remove(key);
  }
}