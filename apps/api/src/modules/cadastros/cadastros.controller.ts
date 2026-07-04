import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { AuthTokenPayload } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { RequirePermissions } from '../auth/permissions.decorator';
import { CadastrosRepository, SaveClienteInput, SaveColaboradorInput, SaveEmbarcacaoInput, SaveFornecedorInput, SavePerfilInput, SaveUsuarioInput } from './cadastros.repository';

@UseGuards(AuthGuard)
@Controller('cadastros')
export class CadastrosController {
  constructor(private readonly repository: CadastrosRepository) {}

  @Get('usuarios')
  @RequirePermissions('cadastros.ver')
  listUsuarios() {
    return this.repository.listUsuarios();
  }

  @Get('perfis')
  @RequirePermissions('cadastros.ver')
  listPerfis() {
    return this.repository.listPerfis();
  }

  @Post('usuarios')
  @RequirePermissions('cadastros.criar')
  createUsuario(@Body() body: SaveUsuarioInput, @CurrentUser() user: AuthTokenPayload) {
    return this.repository.createUsuario(body, user.sub);
  }

  @Patch('usuarios/:id')
  @RequirePermissions('cadastros.editar')
  updateUsuario(@Param('id') id: string, @Body() body: SaveUsuarioInput, @CurrentUser() user: AuthTokenPayload) {
    return this.repository.updateUsuario(id, body, user.sub);
  }

  @Post('perfis')
  @RequirePermissions('cadastros.criar')
  createPerfil(@Body() body: SavePerfilInput, @CurrentUser() user: AuthTokenPayload) {
    return this.repository.createPerfil(body, user.sub);
  }

  @Patch('perfis/:id')
  @RequirePermissions('cadastros.editar')
  updatePerfil(@Param('id') id: string, @Body() body: SavePerfilInput, @CurrentUser() user: AuthTokenPayload) {
    return this.repository.updatePerfil(id, body, user.sub);
  }

  @Get('cidades')
  @RequirePermissions('cadastros.ver')
  listCidades() {
    return this.repository.listCidades();
  }

  @Get('embarcacoes')
  @RequirePermissions('navegacao.ver')
  listEmbarcacoes() {
    return this.repository.listEmbarcacoes();
  }

  @Post('embarcacoes')
  @RequirePermissions('cadastros.criar')
  createEmbarcacao(@Body() body: SaveEmbarcacaoInput, @CurrentUser() user: AuthTokenPayload) {
    return this.repository.createEmbarcacao(body, user.sub);
  }

  @Patch('embarcacoes/:id')
  @RequirePermissions('cadastros.editar')
  updateEmbarcacao(@Param('id') id: string, @Body() body: SaveEmbarcacaoInput, @CurrentUser() user: AuthTokenPayload) {
    return this.repository.updateEmbarcacao(id, body, user.sub);
  }

  @Get('agentes')
  @RequirePermissions('crm.ver')
  listAgentes() {
    return this.repository.listAgentes();
  }

  @Get('clientes')
  @RequirePermissions('crm.ver')
  listClientes() {
    return this.repository.listClientes();
  }

  @Post('clientes')
  @RequirePermissions('crm.criar')
  createCliente(@Body() body: SaveClienteInput, @CurrentUser() user: AuthTokenPayload) {
    return this.repository.createCliente(body, user.sub);
  }

  @Patch('clientes/:id')
  @RequirePermissions('crm.editar')
  updateCliente(@Param('id') id: string, @Body() body: SaveClienteInput & { motivoRealocacao?: string }, @CurrentUser() user: AuthTokenPayload) {
    return this.repository.updateCliente(id, body, user.sub);
  }

  @Get('fornecedores')
  @RequirePermissions('cadastros.ver')
  listFornecedores() {
    return this.repository.listFornecedores();
  }

  @Post('fornecedores')
  @RequirePermissions('cadastros.criar')
  createFornecedor(@Body() body: SaveFornecedorInput) {
    return this.repository.createFornecedor(body);
  }

  @Get('colaboradores')
  @RequirePermissions('cadastros.ver')
  listColaboradores() {
    return this.repository.listColaboradores();
  }

  @Post('colaboradores')
  @RequirePermissions('cadastros.criar')
  createColaborador(@Body() body: SaveColaboradorInput) {
    return this.repository.createColaborador(body);
  }
}
