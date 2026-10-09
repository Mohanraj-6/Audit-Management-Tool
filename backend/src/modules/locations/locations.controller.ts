import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { LocationsService } from './locations.service';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';

@ApiTags('locations')
@Controller('locations')
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all locations' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'departmentId', required: false })
  async findAll(@Query('search') search?: string, @Query('departmentId') deptId?: string) {
    return this.locationsService.findAll(search, deptId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single location' })
  async findOne(@Param('id') id: string) {
    return this.locationsService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a location' })
  async create(@Body() body: any) {
    return this.locationsService.create(body);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a location' })
  async update(@Param('id') id: string, @Body() body: any) {
    return this.locationsService.update(id, body);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a location' })
  async remove(@Param('id') id: string) {
    await this.locationsService.remove(id);
  }
}