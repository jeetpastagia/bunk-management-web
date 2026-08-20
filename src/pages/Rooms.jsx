import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { Card, Button, Input, Spinner, Badge, EmptyState } from '../components/ui';
import { useConfirm } from '../hooks/useConfirm';

export default function Rooms() {
  const { confirm, dialog } = useConfirm();
  const [rooms, setRooms] = useState(null);
  const [roomName, setRoomName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = async () => {
    const res = await api.listRooms();
    setRooms(res.rooms);
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    setCreating(true);
    try {
      const { room } = await api.createRoom(roomName);
      setMessage(`Room created — share this code: ${room.code}`);
      setRoomName('');
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleJoin = async (e) => {
    e.preventDefault();
    setError('');
    setJoining(true);
    try {
      const res = await api.joinRoom(joinCode);
      setMessage(res.message);
      setJoinCode('');
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setJoining(false);
    }
  };

  const handleLeave = async (id) => {
    const ok = await confirm({
      title: 'Leave this room?',
      description: 'You keep the subjects/timetable you already have, but stop getting future updates.',
      confirmLabel: 'Leave room',
    });
    if (!ok) return;
    await api.leaveRoom(id);
    await load();
  };

  const handleDelete = async (id) => {
    const ok = await confirm({
      title: 'Delete this room?',
      description: 'Members keep what they already have, but stop getting future updates.',
      confirmLabel: 'Delete room',
    });
    if (!ok) return;
    await api.deleteRoom(id);
    await load();
  };

  return (
    <div className="flex flex-col gap-6">
      {dialog}
      <div>
        <h1 className="font-display text-2xl font-semibold">Rooms</h1>
        <p className="text-[var(--color-text-muted)] text-sm mt-1">
          Share your subjects and timetable with classmates so no one has to set it up twice. Your own attendance marking always stays private.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <Card>
          <h2 className="font-display font-semibold mb-3">Create a room</h2>
          <form onSubmit={handleCreate} className="flex flex-col gap-3">
            <Input label="Room name" placeholder="e.g. CS-3A DBMS" value={roomName} onChange={(e) => setRoomName(e.target.value)} required />
            <Button type="submit" disabled={creating} className="self-start">{creating ? 'Creating…' : 'Create room'}</Button>
          </form>
          <p className="text-xs text-[var(--color-text-faint)] mt-3">
            Your current semester's subjects + timetable become the room's shared template. Anything you add or change later syncs to everyone who joined.
          </p>
        </Card>

        <Card>
          <h2 className="font-display font-semibold mb-3">Join a room</h2>
          <form onSubmit={handleJoin} className="flex flex-col gap-3">
            <Input
              label="Room code"
              placeholder="e.g. K7M4QP"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              maxLength={6}
              required
            />
            <Button type="submit" disabled={joining} className="self-start">{joining ? 'Joining…' : 'Join room'}</Button>
          </form>
          <p className="text-xs text-[var(--color-text-faint)] mt-3">Get the code from whoever created the room.</p>
        </Card>
      </div>

      {message && <p className="text-sm text-[var(--color-safe)]">{message}</p>}
      {error && <p className="text-sm text-[var(--color-danger)]">{error}</p>}

      <Card>
        <h2 className="font-display font-semibold mb-4">Your rooms</h2>
        {rooms === null ? (
          <div className="flex justify-center py-8"><Spinner /></div>
        ) : rooms.length === 0 ? (
          <EmptyState title="No rooms yet" hint="Create one to share your setup, or join one with a code from a classmate." />
        ) : (
          <div className="flex flex-col divide-y divide-[var(--color-border-soft)]">
            {rooms.map(({ room, role, memberCount }) => (
              <div key={room._id} className="flex items-center justify-between py-3 gap-4 flex-wrap">
                <div className="min-w-0">
                  <p className="font-medium">{room.name}</p>
                  <p className="text-xs text-[var(--color-text-faint)] mt-0.5 mono-num">
                    Code: {room.code}{memberCount !== null ? ` · ${memberCount} member${memberCount === 1 ? '' : 's'}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge tone={role === 'owner' ? 'brand' : 'neutral'}>{role === 'owner' ? 'You own this' : 'Member'}</Badge>
                  {role === 'owner' ? (
                    <Button variant="danger" className="!px-3 !py-1.5 text-xs" onClick={() => handleDelete(room._id)}>Delete</Button>
                  ) : (
                    <Button variant="ghost" className="!px-3 !py-1.5 text-xs" onClick={() => handleLeave(room._id)}>Leave</Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
