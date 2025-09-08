'use client';

import React, { useState, useEffect } from 'react';
import { FixtureRestrictionsPanel } from '@/components/fixture/FixtureRestrictionsPanel';
import { FixtureReschedulePanel } from '@/components/fixture/FixtureReschedulePanel';
import { createFixtureManager, FixtureOptions } from '@/lib/fixture-generator';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Users, Settings, Play, Eye, RefreshCw, Database } from 'lucide-react';
import type { EquipoWithRelations, NewEncuentro } from '@/db/types';

// Mock data - En producción esto vendría de la base de datos
const mockEquipos: EquipoWithRelations[] = [
  {
    id: 1,
    nombre: 'Real Madrid',
    categoria_id: 1,
    entrenador_id: 1,
    imagen_equipo: null,
    estado: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    categoria: null,
    entrenador: null,
  },
  {
    id: 2,
    nombre: 'Barcelona',
    categoria_id: 1,
    entrenador_id: 2,
    imagen_equipo: null,
    estado: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    categoria: null,
    entrenador: null,
  },
  {
    id: 3,
    nombre: 'Atlético Madrid',
    categoria_id: 1,
    entrenador_id: 3,
    imagen_equipo: null,
    estado: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    categoria: null,
    entrenador: null,
  },
  {
    id: 4,
    nombre: 'Sevilla',
    categoria_id: 1,
    entrenador_id: 4,
    imagen_equipo: null,
    estado: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    categoria: null,
    entrenador: null,
  },
  {
    id: 5,
    nombre: 'Valencia',
    categoria_id: 1,
    entrenador_id: 5,
    imagen_equipo: null,
    estado: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    categoria: null,
    entrenador: null,
  },
  {
    id: 6,
    nombre: 'Villarreal',
    categoria_id: 1,
    entrenador_id: 6,
    imagen_equipo: null,
    estado: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    categoria: null,
    entrenador: null,
  },
];

export default function FixtureGestionPage() {
  const [equipos] = useState<EquipoWithRelations[]>(mockEquipos);
  const [configuracion, setConfiguracion] = useState<FixtureOptions>({});
  const [fixtureManager, setFixtureManager] = useState<any>(null);
  const [encuentros, setEncuentros] = useState<NewEncuentro[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [fixtureGenerado, setFixtureGenerado] = useState(false);

  const handleGuardarConfiguracion = (options: FixtureOptions) => {
    setConfiguracion(options);
    console.log('Configuración guardada:', options);
  };

  const generarFixture = async () => {
    setIsGenerating(true);
    try {
      // Simular delay de generación
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const manager = createFixtureManager(equipos, 1, configuracion);
      const resultado = manager.initializeFixture();
      
      setFixtureManager(manager);
      setEncuentros(resultado.encuentros);
      setFixtureGenerado(true);
    } catch (error) {
      console.error('Error generando fixture:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUpdateEncuentros = (nuevosEncuentros: NewEncuentro[]) => {
    setEncuentros(nuevosEncuentros);
  };

  const calcularEstadisticas = () => {
    if (!encuentros.length) return null;
    
    const totalEncuentros = encuentros.length;
    const totalJornadas = Math.max(...encuentros.map(e => e.jornada || 0));
    const fechaInicio = new Date(Math.min(...encuentros.map(e => new Date(e.fecha_programada || new Date()).getTime())));
    const fechaFin = new Date(Math.max(...encuentros.map(e => new Date(e.fecha_programada || new Date()).getTime())));
    const partidosJugados = encuentros.filter(e => e.estado === 'jugado').length;
    
    return {
      totalEncuentros,
      totalJornadas,
      equiposParticipantes: equipos.length,
      fechaInicio,
      fechaFin,
      partidosJugados,
      partidosPendientes: totalEncuentros - partidosJugados
    };
  };

  const estadisticas = calcularEstadisticas();

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gestión de Fixture</h1>
          <p className="text-muted-foreground">
            Configura y gestiona el fixture de manera dinámica
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={fixtureGenerado ? 'default' : 'secondary'}>
            {fixtureGenerado ? 'Fixture Generado' : 'Sin Fixture'}
          </Badge>
        </div>
      </div>

      {/* Información de Equipos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Equipos Participantes ({equipos.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {equipos.map(equipo => (
              <Badge key={equipo.id} variant="outline">
                {equipo.nombre}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Estadísticas si hay fixture generado */}
      {estadisticas && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Estadísticas del Fixture
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold">{estadisticas.totalEncuentros}</div>
                <div className="text-sm text-muted-foreground">Total</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{estadisticas.totalJornadas}</div>
                <div className="text-sm text-muted-foreground">Jornadas</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{estadisticas.equiposParticipantes}</div>
                <div className="text-sm text-muted-foreground">Equipos</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{estadisticas.partidosJugados}</div>
                <div className="text-sm text-muted-foreground">Jugados</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{estadisticas.partidosPendientes}</div>
                <div className="text-sm text-muted-foreground">Pendientes</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {Math.ceil((estadisticas.fechaFin.getTime() - estadisticas.fechaInicio.getTime()) / (1000 * 60 * 60 * 24))}
                </div>
                <div className="text-sm text-muted-foreground">Días</div>
              </div>
            </div>
            <div className="mt-4 text-sm text-muted-foreground">
              <strong>Período:</strong> {estadisticas.fechaInicio.toLocaleDateString()} - {estadisticas.fechaFin.toLocaleDateString()}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs de Gestión */}
      <Tabs defaultValue="configuracion" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="configuracion" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Configuración
          </TabsTrigger>
          <TabsTrigger value="generacion" className="flex items-center gap-2">
            <Play className="h-4 w-4" />
            Generación
          </TabsTrigger>
          <TabsTrigger value="gestion" className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            Gestión Dinámica
          </TabsTrigger>
        </TabsList>

        {/* Tab de Configuración */}
        <TabsContent value="configuracion" className="space-y-6">
          <FixtureRestrictionsPanel
            equipos={equipos}
            onSave={handleGuardarConfiguracion}
            initialOptions={configuracion}
            isGenerating={isGenerating}
          />
        </TabsContent>

        {/* Tab de Generación */}
        <TabsContent value="generacion" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Play className="h-5 w-5" />
                Generar Fixture
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!fixtureGenerado ? (
                <div className="space-y-4">
                  <Alert>
                    <AlertDescription>
                      Configura las restricciones en la pestaña "Configuración" antes de generar el fixture.
                    </AlertDescription>
                  </Alert>
                  
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h3 className="font-medium">Estado de Configuración</h3>
                      <p className="text-sm text-muted-foreground">
                        {Object.keys(configuracion).length > 0 
                          ? 'Configuración lista para generar fixture'
                          : 'Configuración pendiente'
                        }
                      </p>
                    </div>
                    <Button
                      onClick={generarFixture}
                      disabled={isGenerating || Object.keys(configuracion).length === 0}
                      className="flex items-center gap-2"
                    >
                      <Play className="h-4 w-4" />
                      {isGenerating ? 'Generando...' : 'Generar Fixture'}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <Alert>
                    <AlertDescription>
                      ✅ El fixture ha sido generado exitosamente. Puedes gestionar las reprogramaciones en la pestaña "Gestión Dinámica".
                    </AlertDescription>
                  </Alert>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Vista Previa</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {encuentros.slice(0, 5).map((encuentro, index) => (
                            <div key={index} className="flex items-center justify-between p-2 border rounded">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline">Jornada {encuentro.jornada}</Badge>
                                <span className="text-sm">
                                  {equipos.find(e => e.id === encuentro.equipo_local_id)?.nombre} vs {equipos.find(e => e.id === encuentro.equipo_visitante_id)?.nombre}
                                </span>
                              </div>
                              <span className="text-sm text-muted-foreground">
                                {new Date(encuentro.fecha_programada || new Date()).toLocaleDateString()}
                              </span>
                            </div>
                          ))}
                          {encuentros.length > 5 && (
                            <div className="text-center text-sm text-muted-foreground">
                              ... y {encuentros.length - 5} encuentros más
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Acciones</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <Button variant="outline" className="w-full justify-start">
                          <Eye className="h-4 w-4 mr-2" />
                          Ver Fixture Completo
                        </Button>
                        <Button variant="outline" className="w-full justify-start">
                          <Calendar className="h-4 w-4 mr-2" />
                          Exportar Calendario
                        </Button>
                        <Button variant="outline" className="w-full justify-start">
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Regenerar Fixture
                        </Button>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab de Gestión Dinámica */}
        <TabsContent value="gestion" className="space-y-6">
          {fixtureManager ? (
            <FixtureReschedulePanel
              fixtureManager={fixtureManager}
              equipos={equipos}
              onUpdate={handleUpdateEncuentros}
            />
          ) : (
            <Card>
              <CardContent className="pt-6">
                <Alert>
                  <AlertDescription>
                    Primero debes generar el fixture en la pestaña "Generación" para poder gestionar las reprogramaciones.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
