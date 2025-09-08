'use client';

import React, { useState, useEffect } from 'react';
import { FixtureRestrictionsPanel } from '@/components/fixture/FixtureRestrictionsPanel';
import { createFixtureManager, FixtureOptions } from '@/lib/fixture-generator';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Calendar, Users, Settings, Play, Eye, Download } from 'lucide-react';
import type { EquipoWithRelations } from '@/db/types';

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

export default function FixtureRestriccionesPage() {
  const [equipos] = useState<EquipoWithRelations[]>(mockEquipos);
  const [configuracion, setConfiguracion] = useState<FixtureOptions>({});
  const [fixtureGenerado, setFixtureGenerado] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [vista, setVista] = useState<'configuracion' | 'vista-previa'>('configuracion');

  const handleGuardarConfiguracion = (options: FixtureOptions) => {
    setConfiguracion(options);
    // Aquí podrías guardar en la base de datos
    console.log('Configuración guardada:', options);
  };

  const generarFixture = async () => {
    setIsGenerating(true);
    try {
      // Simular delay de generación
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const fixtureManager = createFixtureManager(equipos, 1, configuracion);
      const resultado = fixtureManager.initializeFixture();
      
      setFixtureGenerado(resultado);
      setVista('vista-previa');
    } catch (error) {
      console.error('Error generando fixture:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const exportarFixture = () => {
    if (!fixtureGenerado) return;
    
    const dataStr = JSON.stringify(fixtureGenerado, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'fixture.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  const calcularEstadisticas = () => {
    if (!fixtureGenerado) return null;
    
    const totalEncuentros = fixtureGenerado.encuentros.length;
    const totalJornadas = Math.max(...fixtureGenerado.encuentros.map((e: any) => e.jornada || 0));
    const fechaInicio = new Date(Math.min(...fixtureGenerado.encuentros.map((e: any) => new Date(e.fecha_programada).getTime())));
    const fechaFin = new Date(Math.max(...fixtureGenerado.encuentros.map((e: any) => new Date(e.fecha_programada).getTime())));
    
    return {
      totalEncuentros,
      totalJornadas,
      equiposParticipantes: equipos.length,
      fechaInicio,
      fechaFin
    };
  };

  const estadisticas = calcularEstadisticas();

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Configuración de Fixture</h1>
          <p className="text-muted-foreground">
            Configura las restricciones y parámetros para generar el fixture
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={vista === 'configuracion' ? 'default' : 'outline'}
            onClick={() => setVista('configuracion')}
            className="flex items-center gap-2"
          >
            <Settings className="h-4 w-4" />
            Configuración
          </Button>
          <Button
            variant={vista === 'vista-previa' ? 'default' : 'outline'}
            onClick={() => setVista('vista-previa')}
            disabled={!fixtureGenerado}
            className="flex items-center gap-2"
          >
            <Eye className="h-4 w-4" />
            Vista Previa
          </Button>
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

      {/* Contenido Principal */}
      {vista === 'configuracion' ? (
        <div className="space-y-6">
          {/* Panel de Configuración */}
          <FixtureRestrictionsPanel
            equipos={equipos}
            onSave={handleGuardarConfiguracion}
            initialOptions={configuracion}
            isGenerating={isGenerating}
          />

          {/* Botón de Generar */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Generar Fixture</h3>
                  <p className="text-sm text-muted-foreground">
                    Una vez configuradas las restricciones, genera el fixture completo
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
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Estadísticas */}
          {estadisticas && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Estadísticas del Fixture
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold">{estadisticas.totalEncuentros}</div>
                    <div className="text-sm text-muted-foreground">Encuentros</div>
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

          {/* Vista Previa del Fixture */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Vista Previa del Fixture</CardTitle>
                <Button onClick={exportarFixture} variant="outline" className="flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  Exportar
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {fixtureGenerado?.encuentros.slice(0, 10).map((encuentro: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <Badge variant="outline">Jornada {encuentro.jornada}</Badge>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {equipos.find(e => e.id === encuentro.equipo_local_id)?.nombre}
                        </span>
                        <span className="text-muted-foreground">vs</span>
                        <span className="font-medium">
                          {equipos.find(e => e.id === encuentro.equipo_visitante_id)?.nombre}
                        </span>
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(encuentro.fecha_programada).toLocaleDateString()}
                    </div>
                  </div>
                ))}
                {fixtureGenerado?.encuentros.length > 10 && (
                  <div className="text-center text-muted-foreground">
                    ... y {fixtureGenerado.encuentros.length - 10} encuentros más
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Alertas y Notas */}
          <Alert>
            <AlertDescription>
              <strong>Nota:</strong> El fixture ha sido generado exitosamente con las restricciones configuradas. 
              Los partidos que no pudieron programarse en sus jornadas originales han sido diferidos a jornadas adicionales.
            </AlertDescription>
          </Alert>
        </div>
      )}
    </div>
  );
}
