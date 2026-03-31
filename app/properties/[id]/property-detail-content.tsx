'use client';

import { useState, useEffect, useCallback } from 'react';
import { useProperty } from '@/app/context/PropertyContext';
import { useRouter } from 'next/navigation';
import PropertyHeader from '@/app/components/property-detail/PropertyHeader';
import DailyAgenda from '@/app/components/property-detail/DailyAgenda';
import Calendar from '@/app/components/property-detail/Calendar';
import AccessInstructions from '@/app/components/property-detail/AccessInstructions';
import CleaningAndTasks from '@/app/components/property-detail/CleaningAndTasks';
import MaintenanceIncidents from '@/app/components/property-detail/MaintenanceIncidents';

import * as supabaseLib from '@/lib/supabase';
import type { Logement } from '@/lib/supabase';

interface PropertyDetailContentProps {
  logementId: number;
}

// Separate component with proper suspension
function PropertyDetailInner({ logementId }: PropertyDetailContentProps) {
  const router = useRouter();
  const [logement, setLogement] = useState<Logement | null>(null);
  const [accessInstructions, setAccessInstructions] = useState<any[]>([]);
  const [todayEvents, setTodayEvents] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const {
    getRentalsByLogement,
    getAccessInstructionsByLogement,
    getTasksByLogement,
    getIncidentsByLogement,
    getTodayEventsByLogement,
    addAccessInstruction,
    updateAccessInstruction,
    deleteAccessInstruction,
    addTask,
    updateTask,
    deleteTask,
    addIncident,
    updateIncident,
    deleteIncident,
    addDailyEvent,
  } = useProperty();

  // Load all data for this property
  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      try {
        setLoading(true);
        const logements = await supabaseLib.getLogements();
        const found = logements.find(l => l.id === logementId);
        
        if (!isMounted) return;
        setLogement(found || null);

        if (found) {
          const today = new Date().toISOString().split('T')[0];
          const [instructions, events, tasksData, incidentsData] = await Promise.all([
            supabaseLib.getAccessInstructions(logementId),
            supabaseLib.getDailyEvents(logementId, today),
            supabaseLib.getTasks(logementId),
            supabaseLib.getIncidents(logementId)
          ]);
          
          if (isMounted) {
            setAccessInstructions(instructions);
            setTodayEvents(events);
            setTasks(tasksData);
            setIncidents(incidentsData);
          }
        }
      } catch (error) {
        console.error('Error loading property:', error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadData();
    
    return () => {
      isMounted = false;
    };
  }, [logementId]);

  if (loading || !logement) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Chargement...</div>;
  }

  const rentals = getRentalsByLogement(logementId);
  const activeRental = rentals.find(r => r.status === 'active');

  const handleSendToClient = async () => {
    if (!activeRental) return;
    const instructionsData = await getAccessInstructionsByLogement(logementId);
    const instructionsText = instructionsData
      .map(i => `${i.type.toUpperCase()}: ${i.instruction}`)
      .join('\n');
    const message = `Bienvenue! Voici les instructions d'accès pour ${logement.name}:\n\n${instructionsText}`;
    alert(`Message envoyé à ${activeRental.email}:\n\n${message}`);
  };

  const handleAddTask = async (task: any) => {
    const newTask = await addTask(task);
    setTasks([...tasks, newTask]);
    return newTask;
  };

  const handleUpdateTask = async (id: number, updates: Partial<any>) => {
    const updated = await updateTask(id, updates);
    setTasks(tasks.map(t => t.id === id ? updated : t));
    return updated;
  };

  const handleDeleteTask = async (id: number) => {
    await deleteTask(id);
    setTasks(tasks.filter(t => t.id !== id));
  };

  const handleAddIncident = async (incident: any) => {
    const newIncident = await addIncident(incident);
    setIncidents([...incidents, newIncident]);
    return newIncident;
  };

  const handleUpdateIncident = async (id: number, updates: Partial<any>) => {
    const updated = await updateIncident(id, updates);
    setIncidents(incidents.map(i => i.id === id ? updated : i));
    return updated;
  };

  const handleDeleteIncident = async (id: number) => {
    await deleteIncident(id);
    setIncidents(incidents.filter(i => i.id !== id));
  }

  const handleAddAccessInstruction = async (instruction: Omit<any, 'id' | 'created_at' | 'last_updated'>) => {
    try {
      await addAccessInstruction(instruction);
      const updatedInstructions = await getAccessInstructionsByLogement(logementId);
      setAccessInstructions(updatedInstructions);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleDeleteAccessInstruction = async (id: number) => {
    try {
      await deleteAccessInstruction(id);
      const updatedInstructions = await getAccessInstructionsByLogement(logementId);
      setAccessInstructions(updatedInstructions);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  return (
    <div className="property-detail-page" suppressHydrationWarning>
      <div className="page-header">
        <button onClick={() => router.back()} className="btn-back">
          <i className="fas fa-arrow-left"></i>
        </button>
        <h1>{logement.name}</h1>
      </div>

      <div className="page-content">
        <PropertyHeader logement={logement} activeRental={activeRental} />

        <div className="property-detail-grid">
          <div className="left-column">
            <Calendar
              logementId={logementId}
              events={todayEvents}
              onAddEvent={addDailyEvent}
            />
          </div>

          <div className="center-column">
            <AccessInstructions
              logementId={logementId}
              instructions={accessInstructions}
              activeRental={activeRental}
              onSend={handleSendToClient}
              onUpdate={updateAccessInstruction}
              onDelete={handleDeleteAccessInstruction}
              onAdd={handleAddAccessInstruction}
            />
            <DailyAgenda 
              events={todayEvents}
              onAddEvent={addDailyEvent}
            />
          </div>

          <div className="right-column">
            <CleaningAndTasks
              logementId={logementId}
              tasks={tasks}
              onAddTask={handleAddTask}
              onToggleTask={(id, completed) => handleUpdateTask(id, { completed, completed_date: completed ? new Date().toISOString() : null })}
              onDeleteTask={handleDeleteTask}
            />
            <MaintenanceIncidents
              logementId={logementId}
              incidents={incidents}
              onAddIncident={handleAddIncident}
              onResolveIncident={(id, resolved) => handleUpdateIncident(id, { resolved, resolved_date: resolved ? new Date().toISOString() : null })}
              onDeleteIncident={handleDeleteIncident}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PropertyDetailContent({ logementId }: PropertyDetailContentProps) {
  // Force remount on logementId change with key
  return <PropertyDetailInner key={logementId} logementId={logementId} />;
}
