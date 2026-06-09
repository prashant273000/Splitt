import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { logout } from '../features/auth/api';
import { useRequireAuth } from '../features/auth/hooks';
import { getMatches } from '../features/matches/api';
import { useConfirmMatch, useRejectMatch } from '../features/matches/hooks';
import { getIntents } from '../features/intents/api';
import { useCancelIntent } from '../features/intents/hooks';
import { getMyRides } from '../features/rides/api';
import { useCancelRide } from '../features/rides/hooks';
import { openEventStream } from '../lib/sse';
import ConfirmModal from '../components/ConfirmModal';

const DESTINATION_LABELS = {
  RAILWAY_STATION: 'Railway Station',
  BUS_STAND: 'Bus Stand',
  CITY_CENTER: 'City Center',
  AIRPORT: 'Airport',
};

function fmtDirection(d) {
  return d === 'FROM_CAMPUS' ? 'Going Out' : 'Coming Back';
}
function fmtDest(d) {
  return DESTINATION_LABELS[d] ?? d;
}
function fmtDateTime(iso) {
  return new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}
function fmtTime(iso) {
  return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

function sortMatches(matches) {
  return [...matches].sort((a, b) => {
    const aC = a.posterConfirmed && a.seekerConfirmed;
    const bC = b.posterConfirmed && b.seekerConfirmed;
    if (aC !== bC) return aC ? -1 : 1;
    return new Date(a.createdAt) - new Date(b.createdAt);
  });
}

function UserAvatar({ user }) {
  if (user.picture) {
    return (
      <img
        src={user.picture}
        alt={user.name}
        className="w-10 h-10 rounded-full object-cover flex-shrink-0"
      />
    );
  }
  return (
    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-sm font-bold text-gray-600 flex-shrink-0">
      {user.name[0].toUpperCase()}
    </div>
  );
}

function RatingBadge({ thumbsUp, thumbsDown }) {
  return (
    <span className="text-sm text-gray-500">
      +{thumbsUp} / -{thumbsDown}
    </span>
  );
}

function WhatsAppLink({ phone }) {
  const cleaned = phone.replace(/\D/g, '');
  return (
    <a
      href={`https://wa.me/${cleaned}`}
      target="_blank"
      rel="noreferrer"
      className="bg-green-600 text-white rounded-md px-3 py-1.5 text-sm"
    >
      Message on WhatsApp
    </a>
  );
}

function MatchActions({ match, onConfirm, onReject, isPending, error }) {
  const confirmed = match.posterConfirmed && match.seekerConfirmed;
  const otherUser = match.otherUser;

  if (confirmed) {
    return otherUser.phone ? (
      <WhatsAppLink phone={otherUser.phone} />
    ) : (
      <span className="text-sm text-gray-500 italic">Confirmed — no phone set</span>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-2">
        <button
          onClick={() => onConfirm(match.id)}
          disabled={isPending}
          className="bg-blue-600 text-white rounded-md px-3 py-1.5 text-sm disabled:opacity-50"
        >
          Confirm
        </button>
        <button
          onClick={() => onReject(match.id)}
          disabled={isPending}
          className="bg-red-600 text-white rounded-md px-3 py-1.5 text-sm disabled:opacity-50"
        >
          Reject
        </button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

function PosterMatchCard({ match, onConfirm, onReject, activeMatchId, confirmError }) {
  const isPending = activeMatchId === match.id;
  const error = isPending ? confirmError : null;

  return (
    <div className="bg-white rounded-lg shadow-sm p-4 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3 min-w-0">
        <UserAvatar user={match.otherUser} />
        <div className="min-w-0">
          <div className="font-medium truncate">{match.otherUser.name}</div>
          <RatingBadge
            thumbsUp={match.otherUser.thumbsUp}
            thumbsDown={match.otherUser.thumbsDown}
          />
        </div>
      </div>
      <div className="flex-shrink-0">
        <MatchActions
          match={match}
          onConfirm={onConfirm}
          onReject={onReject}
          isPending={isPending}
          error={error}
        />
      </div>
    </div>
  );
}

function SeekerMatchCard({ match, onConfirm, onReject, activeMatchId, confirmError }) {
  const isPending = activeMatchId === match.id;
  const error = isPending ? confirmError : null;
  const ride = match.ride;

  return (
    <div className="bg-white rounded-lg shadow-sm p-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <UserAvatar user={match.otherUser} />
          <div className="min-w-0">
            <div className="font-medium truncate">{match.otherUser.name}</div>
            <RatingBadge
              thumbsUp={match.otherUser.thumbsUp}
              thumbsDown={match.otherUser.thumbsDown}
            />
          </div>
        </div>
        <div className="flex-shrink-0">
          <MatchActions
            match={match}
            onConfirm={onConfirm}
            onReject={onReject}
            isPending={isPending}
            error={error}
          />
        </div>
      </div>
      <div className="mt-3 text-sm text-gray-600 border-t pt-3 flex flex-wrap gap-x-3 gap-y-1">
        <span>
          {fmtDirection(ride.direction)} → {fmtDest(ride.otherPoint)}
        </span>
        <span>{fmtDateTime(ride.departureTime)}</span>
        <span>₹{ride.farePerHead}/head</span>
        <span>
          {ride.seatsAvailable} seat{ride.seatsAvailable !== 1 ? 's' : ''} left
        </span>
      </div>
    </div>
  );
}

function RideSection({
  ride,
  matches,
  onConfirm,
  onReject,
  onCancel,
  activeMatchId,
  confirmError,
}) {
  const filledSeats = ride.seatsTotal - ride.seatsAvailable;
  const sorted = sortMatches(matches);

  return (
    <section>
      <h2 className="text-lg font-bold mb-3">Your Ride</h2>
      <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-sm text-gray-500 mb-0.5">{fmtDirection(ride.direction)}</div>
            <div className="text-xl font-bold">{fmtDest(ride.otherPoint)}</div>
            <div className="text-sm text-gray-600 mt-1">{fmtDateTime(ride.departureTime)}</div>
            <div className="mt-2 text-sm text-gray-700">
              {filledSeats}/{ride.seatsTotal} seats filled · ₹{ride.farePerHead}/head
            </div>
            {ride.notes && <div className="mt-1 text-sm text-gray-500">{ride.notes}</div>}
          </div>
          <div className="flex flex-col items-end gap-2 flex-shrink-0">
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                ride.status === 'FULL'
                  ? 'bg-orange-100 text-orange-700'
                  : 'bg-green-100 text-green-700'
              }`}
            >
              {ride.status}
            </span>
            <button
              onClick={() => onCancel(ride.id)}
              className="bg-red-600 text-white rounded-md px-3 py-1.5 text-sm"
            >
              Cancel Ride
            </button>
          </div>
        </div>
      </div>
      {sorted.length > 0 ? (
        <div className="space-y-3">
          <p className="text-sm font-medium text-gray-500">Ride Requests ({sorted.length})</p>
          {sorted.map((m) => (
            <PosterMatchCard
              key={m.id}
              match={m}
              onConfirm={onConfirm}
              onReject={onReject}
              activeMatchId={activeMatchId}
              confirmError={confirmError}
            />
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-500">Waiting for riders to match...</p>
      )}
    </section>
  );
}

function IntentSection({
  intent,
  matches,
  onConfirm,
  onReject,
  onCancel,
  activeMatchId,
  confirmError,
}) {
  const sorted = sortMatches(matches);

  return (
    <section>
      <h2 className="text-lg font-bold mb-3">Your Intent</h2>
      <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-sm text-gray-500 mb-0.5">{fmtDirection(intent.direction)}</div>
            <div className="text-xl font-bold">{fmtDest(intent.otherPoint)}</div>
            <div className="text-sm text-gray-600 mt-1">
              {fmtTime(intent.earliestTime)} – {fmtTime(intent.latestTime)}
            </div>
            {intent.maxFare != null && (
              <div className="mt-1 text-sm text-gray-500">Max ₹{intent.maxFare}</div>
            )}
            <div className="mt-1 text-xs text-gray-400">
              {intent.matchCount} match{intent.matchCount !== 1 ? 'es' : ''}
            </div>
          </div>
          <button
            onClick={() => onCancel(intent.id)}
            className="bg-red-600 text-white rounded-md px-3 py-1.5 text-sm flex-shrink-0"
          >
            Cancel Intent
          </button>
        </div>
      </div>
      {sorted.length > 0 ? (
        <div className="space-y-3">
          <p className="text-sm font-medium text-gray-500">Matching Rides ({sorted.length})</p>
          {sorted.map((m) => (
            <SeekerMatchCard
              key={m.id}
              match={m}
              onConfirm={onConfirm}
              onReject={onReject}
              activeMatchId={activeMatchId}
              confirmError={confirmError}
            />
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-500">Waiting for matching rides...</p>
      )}
    </section>
  );
}

export default function Home() {
  const queryClient = useQueryClient();

  useEffect(() => {
    document.title = 'Splitt';
  }, []);

  const [cancelTarget, setCancelTarget] = useState(null);
  const [activeMatchId, setActiveMatchId] = useState(null);
  const [confirmError, setConfirmError] = useState('');

  const confirmMutation = useConfirmMatch();
  const rejectMutation = useRejectMatch();
  const cancelRideMutation = useCancelRide();
  const cancelIntentMutation = useCancelIntent();

  const { data: user, isLoading: userLoading } = useRequireAuth();

  const { data: myRides = [], isLoading: ridesLoading } = useQuery({
    queryKey: ['myRides'],
    queryFn: getMyRides,
    enabled: !!user,
    retry: false,
  });

  const { data: matches = [], isLoading: matchesLoading } = useQuery({
    queryKey: ['matches'],
    queryFn: getMatches,
    enabled: !!user,
    retry: false,
  });

  const { data: intents = [] } = useQuery({
    queryKey: ['intents'],
    queryFn: getIntents,
    enabled: !!user,
    retry: false,
  });

  useEffect(() => {
    if (!user) return;
    const invalidateAll = () => {
      queryClient.invalidateQueries({ queryKey: ['matches'] });
      queryClient.invalidateQueries({ queryKey: ['myRides'] });
      queryClient.invalidateQueries({ queryKey: ['intents'] });
    };
    const disconnect = openEventStream({
      'match.created': invalidateAll,
      'match.confirmed': invalidateAll,
      'match.cancelled': invalidateAll,
      'ride.updated': invalidateAll,
    });
    return disconnect;
  }, [user, queryClient]);

  async function handleConfirm(matchId) {
    setActiveMatchId(matchId);
    setConfirmError('');
    try {
      await confirmMutation.mutateAsync(matchId);
    } catch (err) {
      setConfirmError(
        err.message.toLowerCase().includes('full') ? 'This ride just filled up.' : err.message,
      );
    } finally {
      setActiveMatchId(null);
    }
  }

  async function handleReject(matchId) {
    await rejectMutation.mutateAsync(matchId);
  }

  async function handleCancelConfirmed() {
    if (!cancelTarget) return;
    try {
      if (cancelTarget.type === 'ride') {
        await cancelRideMutation.mutateAsync(cancelTarget.id);
      } else {
        await cancelIntentMutation.mutateAsync(cancelTarget.id);
      }
    } finally {
      setCancelTarget(null);
    }
  }

  if (userLoading || !user) return <div className="p-8 text-gray-500">Loading...</div>;

  if (ridesLoading || matchesLoading) return <div className="p-8 text-gray-500">Loading...</div>;

  const posterMatchesByRide = new Map();
  for (const m of matches.filter((match) => match.myRole === 'poster')) {
    if (!posterMatchesByRide.has(m.rideId)) posterMatchesByRide.set(m.rideId, []);
    posterMatchesByRide.get(m.rideId).push(m);
  }

  const intentMatchMap = new Map();
  for (const m of matches.filter((match) => match.myRole === 'seeker')) {
    if (!intentMatchMap.has(m.intentId)) intentMatchMap.set(m.intentId, []);
    intentMatchMap.get(m.intentId).push(m);
  }

  const hasActivePoster = myRides.length > 0;
  // Keep seeker section visible even after intent is deactivated (confirmed match still exists)
  const hasActiveSeeker = intents.length > 0 || intentMatchMap.size > 0;

  // Confirmed matches whose intent is no longer active (deactivated post-confirmation)
  const confirmedSeekerMatches = [...intentMatchMap.entries()]
    .filter(([intentId]) => !intents.some((i) => i.id === intentId))
    .flatMap(([, ms]) => ms);

  const isCancelling = cancelRideMutation.isPending || cancelIntentMutation.isPending;

  const header = (
    <div className="flex items-center justify-between mb-6">
      <span className="text-gray-600">
        Hi, <span className="font-medium">{user.name}</span>
      </span>
      <button
        className="text-sm text-gray-500 underline"
        onClick={async () => {
          await logout();
          window.location.reload();
        }}
      >
        Sign out
      </button>
    </div>
  );

  if (!hasActivePoster && !hasActiveSeeker) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        {header}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link
            to="/post-ride"
            className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow block"
          >
            <h2 className="font-bold text-lg mb-1">I&apos;m taking a ride</h2>
            <p className="text-gray-600">Fill empty seats in your auto.</p>
          </Link>
          <Link
            to="/post-intent"
            className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow block"
          >
            <h2 className="font-bold text-lg mb-1">I need a ride</h2>
            <p className="text-gray-600">Tell Splitt where you want to go.</p>
          </Link>
        </div>
      </div>
    );
  }

  const intentSections = intents.map((intent) => ({
    intent,
    matches: intentMatchMap.get(intent.id) ?? [],
  }));

  const sharedMatchProps = {
    onConfirm: handleConfirm,
    onReject: handleReject,
    activeMatchId,
    confirmError,
  };

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-10">
      {header}

      {hasActivePoster &&
        myRides.map((ride) => (
          <RideSection
            key={ride.id}
            ride={ride}
            matches={posterMatchesByRide.get(ride.id) ?? []}
            onCancel={(id) => setCancelTarget({ type: 'ride', id })}
            {...sharedMatchProps}
          />
        ))}

      {hasActiveSeeker &&
        intentSections.map(({ intent, matches: intentMatches }) => (
          <IntentSection
            key={intent.id}
            intent={intent}
            matches={intentMatches}
            onCancel={(id) => setCancelTarget({ type: 'intent', id })}
            {...sharedMatchProps}
          />
        ))}

      {confirmedSeekerMatches.length > 0 && (
        <section>
          <h2 className="text-lg font-bold mb-3">Confirmed Ride</h2>
          <div className="space-y-3">
            {confirmedSeekerMatches.map((m) => (
              <SeekerMatchCard key={m.id} match={m} {...sharedMatchProps} />
            ))}
          </div>
        </section>
      )}

      {cancelTarget && (
        <ConfirmModal
          message={
            cancelTarget.type === 'ride'
              ? 'Cancel this ride? All pending match requests will be removed.'
              : 'Cancel this intent? All pending matches will be removed.'
          }
          onConfirm={handleCancelConfirmed}
          onCancel={() => setCancelTarget(null)}
          isPending={isCancelling}
        />
      )}
    </div>
  );
}
