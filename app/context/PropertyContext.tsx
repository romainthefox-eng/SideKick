'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import type {
  Logement,
  Rental,
  ExternalListing,
  PriceHistory,
  CalendarSync,
  AccessInstruction,
  Task,
  Incident,
  DailyEvent,
} from '../../lib/supabase';
import * as supabaseLib from '../../lib/supabase';

// Export types for use in components
export type { Logement, Rental, AccessInstruction, Task, Incident, DailyEvent };

interface PropertyContextType {
  logements: Logement[];
  rentals: Rental[];
  tasks: Task[];
  incidents: Incident[];
  loading: boolean;
  
  // Logement operations
  addLogement: (logement: Omit<Logement, 'id' | 'created_at' | 'updated_at'>) => Promise<Logement>;
  updateLogement: (id: number, updates: Partial<Logement>) => Promise<Logement>;
  deleteLogement: (id: number) => Promise<void>;
  
  // Rental operations
  getRentalsByLogement: (logementId: number) => Rental[];
  getAllRentals: () => Rental[];
  addRental: (rental: Omit<Rental, 'id' | 'created_at' | 'updated_at'>) => Promise<Rental>;
  updateRental: (id: number, updates: Partial<Rental>) => Promise<Rental>;
  deleteRental: (id: number) => Promise<void>;
  
  // Task operations
  getTasksByLogement: (logementId: number) => Task[];
  addTask: (task: Omit<Task, 'id' | 'created_at' | 'updated_at'>) => Promise<Task>;
  updateTask: (id: number, updates: Partial<Task>) => Promise<Task>;
  deleteTask: (id: number) => Promise<void>;
  
  // Incident operations
  getIncidentsByLogement: (logementId: number) => Incident[];
  addIncident: (incident: Omit<Incident, 'id' | 'created_at' | 'updated_at'>) => Promise<Incident>;
  updateIncident: (id: number, updates: Partial<Incident>) => Promise<Incident>;
  deleteIncident: (id: number) => Promise<void>;
  
  // Access instruction operations
  getAccessInstructionsByLogement: (logementId: number) => Promise<AccessInstruction[]>;
  addAccessInstruction: (instruction: Omit<AccessInstruction, 'id' | 'created_at' | 'last_updated'>) => Promise<AccessInstruction>;
  updateAccessInstruction: (id: number, updates: Partial<AccessInstruction>) => Promise<AccessInstruction>;
  deleteAccessInstruction: (id: number) => Promise<void>;
  
  // Daily event operations
  getDailyEventsByLogement: (logementId: number, date?: string) => Promise<DailyEvent[]>;
  getTodayEventsByLogement: (logementId: number) => Promise<DailyEvent[]>;
  addDailyEvent: (event: Omit<DailyEvent, 'id' | 'created_at'>) => Promise<DailyEvent>;
  deleteDailyEvent: (id: number) => Promise<void>;
  
  // Notifications
  getNotifications: () => Array<{type: 'task' | 'incident', item: Task | Incident, logement: Logement}>;
}

const PropertyContext = createContext<PropertyContextType | undefined>(undefined);

export function PropertyProvider({ children }: { children: ReactNode }) {
  const [logements, setLogements] = useState<Logement[]>([]);
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);

  // Load data on mount
  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    try {
      setLoading(true);
      const [logementsData, rentalsData, tasksData, incidentsData] = await Promise.all([
        supabaseLib.getLogements(),
        supabaseLib.getRentals(),
        supabaseLib.getTasks(),
        supabaseLib.getIncidents(),
      ]);
      setLogements(logementsData);
      setRentals(rentalsData);
      setTasks(tasksData);
      setIncidents(incidentsData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // LOGEMENT OPERATIONS
  // ============================================

  const addLogement = async (logement: Omit<Logement, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const newLogement = await supabaseLib.addLogement(logement);
      setLogements([...logements, newLogement]);
      return newLogement;
    } catch (error) {
      console.error('Error adding logement:', error);
      throw error;
    }
  };

  const updateLogement = async (id: number, updates: Partial<Logement>) => {
    try {
      const updated = await supabaseLib.updateLogement(id, updates);
      setLogements(logements.map(l => l.id === id ? updated : l));
      return updated;
    } catch (error) {
      console.error('Error updating logement:', error);
      throw error;
    }
  };

  const deleteLogement = async (id: number) => {
    try {
      await supabaseLib.deleteLogement(id);
      setLogements(logements.filter(l => l.id !== id));
      setRentals(rentals.filter(r => r.logement_id !== id));
      setTasks(tasks.filter(t => t.logement_id !== id));
      setIncidents(incidents.filter(i => i.logement_id !== id));
    } catch (error) {
      console.error('Error deleting logement:', error);
      throw error;
    }
  };

  // ============================================
  // RENTAL OPERATIONS
  // ============================================

  const getRentalsByLogement = (logementId: number) => {
    return rentals.filter(r => r.logement_id === logementId);
  };

  const getAllRentals = () => rentals;

  const addRental = async (rental: Omit<Rental, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const newRental = await supabaseLib.addRental(rental);
      setRentals([...rentals, newRental]);
      return newRental;
    } catch (error) {
      console.error('Error adding rental:', error);
      throw error;
    }
  };

  const updateRental = async (id: number, updates: Partial<Rental>) => {
    try {
      const updated = await supabaseLib.updateRental(id, updates);
      setRentals(rentals.map(r => r.id === id ? updated : r));
      return updated;
    } catch (error) {
      console.error('Error updating rental:', error);
      throw error;
    }
  };

  const deleteRental = async (id: number) => {
    try {
      await supabaseLib.deleteRental(id);
      setRentals(rentals.filter(r => r.id !== id));
    } catch (error) {
      console.error('Error deleting rental:', error);
      throw error;
    }
  };

  // ============================================
  // TASK OPERATIONS
  // ============================================

  const getTasksByLogement = (logementId: number) => {
    return tasks.filter(t => t.logement_id === logementId);
  };

  const addTask = async (task: Omit<Task, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const newTask = await supabaseLib.addTask(task);
      setTasks([...tasks, newTask]);
      return newTask;
    } catch (error) {
      console.error('Error adding task:', error);
      throw error;
    }
  };

  const updateTask = async (id: number, updates: Partial<Task>) => {
    try {
      const updated = await supabaseLib.updateTask(id, updates);
      setTasks(tasks.map(t => t.id === id ? updated : t));
      return updated;
    } catch (error) {
      console.error('Error updating task:', error);
      throw error;
    }
  };

  const deleteTask = async (id: number) => {
    try {
      await supabaseLib.deleteTask(id);
      setTasks(tasks.filter(t => t.id !== id));
    } catch (error) {
      console.error('Error deleting task:', error);
      throw error;
    }
  };

  // ============================================
  // INCIDENT OPERATIONS
  // ============================================

  const getIncidentsByLogement = (logementId: number) => {
    return incidents.filter(i => i.logement_id === logementId);
  };

  const addIncident = async (incident: Omit<Incident, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const newIncident = await supabaseLib.addIncident(incident);
      setIncidents([...incidents, newIncident]);
      return newIncident;
    } catch (error) {
      console.error('Error adding incident:', error);
      throw error;
    }
  };

  const updateIncident = async (id: number, updates: Partial<Incident>) => {
    try {
      const updated = await supabaseLib.updateIncident(id, updates);
      setIncidents(incidents.map(i => i.id === id ? updated : i));
      return updated;
    } catch (error) {
      console.error('Error updating incident:', error);
      throw error;
    }
  };

  const deleteIncident = async (id: number) => {
    try {
      await supabaseLib.deleteIncident(id);
      setIncidents(incidents.filter(i => i.id !== id));
    } catch (error) {
      console.error('Error deleting incident:', error);
      throw error;
    }
  };

  // ============================================
  // ACCESS INSTRUCTION OPERATIONS
  // ============================================

  const getAccessInstructionsByLogement = async (logementId: number) => {
    try {
      return await supabaseLib.getAccessInstructions(logementId);
    } catch (error) {
      console.error('Error getting access instructions:', error);
      return [];
    }
  };

  const addAccessInstruction = async (instruction: Omit<AccessInstruction, 'id' | 'created_at' | 'last_updated'>) => {
    try {
      return await supabaseLib.addAccessInstruction(instruction);
    } catch (error) {
      console.error('Error adding access instruction:', error);
      throw error;
    }
  };

  const updateAccessInstruction = async (id: number, updates: Partial<AccessInstruction>) => {
    try {
      return await supabaseLib.updateAccessInstruction(id, updates);
    } catch (error) {
      console.error('Error updating access instruction:', error);
      throw error;
    }
  };

  const deleteAccessInstruction = async (id: number) => {
    try {
      await supabaseLib.deleteAccessInstruction(id);
    } catch (error) {
      console.error('Error deleting access instruction:', error);
      throw error;
    }
  };

  // ============================================
  // DAILY EVENT OPERATIONS
  // ============================================

  const getDailyEventsByLogement = async (logementId: number, date?: string) => {
    try {
      return await supabaseLib.getDailyEvents(logementId, date);
    } catch (error) {
      console.error('Error getting daily events:', error);
      return [];
    }
  };

  const getTodayEventsByLogement = async (logementId: number) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      return await supabaseLib.getDailyEvents(logementId, today);
    } catch (error) {
      console.error('Error getting today events:', error);
      return [];
    }
  };

  const addDailyEvent = async (event: Omit<DailyEvent, 'id' | 'created_at'>) => {
    try {
      return await supabaseLib.addDailyEvent(event);
    } catch (error) {
      console.error('Error adding daily event:', error);
      throw error;
    }
  };

  const deleteDailyEvent = async (id: number) => {
    try {
      await supabaseLib.deleteDailyEvent(id);
    } catch (error) {
      console.error('Error deleting daily event:', error);
      throw error;
    }
  };

  // ============================================
  // NOTIFICATIONS
  // ============================================

  const getNotifications = () => {
    const notifications: Array<{type: 'task' | 'incident', item: Task | Incident, logement: Logement}> = [];
    
    // Get incomplete tasks due soon
    tasks.filter(t => !t.completed && t.due_date).forEach(task => {
      const logement = logements.find(l => l.id === task.logement_id);
      if (logement) {
        notifications.push({ type: 'task', item: task, logement });
      }
    });
    
    // Get unresolved incidents
    incidents.filter(i => !i.resolved).forEach(incident => {
      const logement = logements.find(l => l.id === incident.logement_id);
      if (logement) {
        notifications.push({ type: 'incident', item: incident, logement });
      }
    });
    
    return notifications;
  };

  // ============================================
  // CONTEXT VALUE
  // ============================================

  const value: PropertyContextType = {
    logements,
    rentals,
    tasks,
    incidents,
    loading,
    addLogement,
    updateLogement,
    deleteLogement,
    getRentalsByLogement,
    getAllRentals,
    addRental,
    updateRental,
    deleteRental,
    getTasksByLogement,
    addTask,
    updateTask,
    deleteTask,
    getIncidentsByLogement,
    addIncident,
    updateIncident,
    deleteIncident,
    getAccessInstructionsByLogement,
    addAccessInstruction,
    updateAccessInstruction,
    deleteAccessInstruction,
    getDailyEventsByLogement,
    getTodayEventsByLogement,
    addDailyEvent,
    deleteDailyEvent,
    getNotifications,
  };

  return (
    <PropertyContext.Provider value={value}>
      {children}
    </PropertyContext.Provider>
  );
}

export function useProperty() {
  const context = useContext(PropertyContext);
  if (context === undefined) {
    throw new Error('useProperty must be used within PropertyProvider');
  }
  return context;
}
