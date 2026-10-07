import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';

import { getDb } from '@/db';
import { qk } from '@/db/queryKeys';

import {
  addNote,
  deleteNote,
  listNotes,
  notesOnDay,
  setRating,
  setWouldRebuy,
  updateNote,
  type NoteInput,
} from './notesRepo';

/** P2 Notes timeline: the product's notes, newest first. */
export function useProductNotes(productId: number) {
  return useQuery({
    queryKey: qk.notes.product(productId),
    queryFn: () => listNotes(getDb(), productId),
  });
}

/** C2: notes written on an app day, each with its product. */
export function useNotesOnDay(day: string) {
  return useQuery({ queryKey: qk.notes.day(day), queryFn: () => notesOnDay(getDb(), day) });
}

const invalidateNotes = (client: QueryClient) =>
  client.invalidateQueries({ queryKey: qk.notes.all });

export function useAddNote() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (input: NoteInput & { productId: number }) => addNote(getDb(), input),
    onSuccess: () => invalidateNotes(client),
  });
}

export function useUpdateNote() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: number; input: NoteInput }) =>
      updateNote(getDb(), id, input),
    onSuccess: () => invalidateNotes(client),
  });
}

export function useDeleteNote() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => deleteNote(getDb(), id),
    onSuccess: () => invalidateNotes(client),
  });
}

/** Rating and "Would buy again" show on the product and on the shopping list. */
const invalidateRating = (client: QueryClient) => {
  client.invalidateQueries({ queryKey: qk.products.all });
  client.invalidateQueries({ queryKey: qk.shopping.all });
};

export function useSetRating() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ productId, rating }: { productId: number; rating: number | null }) =>
      setRating(getDb(), productId, rating),
    onSuccess: () => invalidateRating(client),
  });
}

export function useSetWouldRebuy() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ productId, value }: { productId: number; value: boolean | null }) =>
      setWouldRebuy(getDb(), productId, value),
    onSuccess: () => invalidateRating(client),
  });
}
