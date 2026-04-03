import { Link } from 'react-router'
import { useGameStore } from '../../app/store/gameStore'
import { APP_ROUTES } from '../../app/routes'
import { DetailStat } from '../../components/StatCard'
import { CARD_UI_TEXT, SHELL_UI_TEXT } from '../../data/copy'

export default function CardsPage() {
  const { game, drawPartyCards, discardPartyCard } = useGameStore()
  const partyCards = game.partyCards

  if (!partyCards) {
    return (
      <section className="panel panel-support space-y-2">
        <h2 className="text-xl font-semibold">{CARD_UI_TEXT.pageHeading}</h2>
        <p className="text-sm opacity-60">Party-card subsystem is not initialized for this run.</p>
      </section>
    )
  }

  const handCards = partyCards.hand.map((cardId) => partyCards.cards[cardId]).filter(Boolean)

  return (
    <section className="space-y-4" aria-label="Party cards view">
      <article className="panel panel-primary space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">{CARD_UI_TEXT.pageHeading}</h2>
            <p className="text-sm opacity-60">{CARD_UI_TEXT.pageSubtitle}</p>
          </div>
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => drawPartyCards(1)}
            disabled={partyCards.hand.length >= partyCards.maxHandSize}
          >
            {CARD_UI_TEXT.drawCard}
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <DetailStat label={CARD_UI_TEXT.deckHeading} value={String(partyCards.deck.length)} />
          <DetailStat label={CARD_UI_TEXT.handHeading} value={String(partyCards.hand.length)} />
          <DetailStat
            label={CARD_UI_TEXT.discardHeading}
            value={String(partyCards.discard.length)}
          />
        </div>
      </article>

      <article className="panel panel-support space-y-3">
        <h3 className="text-lg font-semibold">{CARD_UI_TEXT.handHeading}</h3>
        {handCards.length > 0 ? (
          <ul className="space-y-2">
            {handCards.map((card) => (
              <li
                key={card.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded border border-white/10 px-3 py-2"
              >
                <div>
                  <p className="font-medium">{card.title}</p>
                  <p className="text-sm opacity-60">{card.description}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Link to={APP_ROUTES.cases} className="btn btn-sm btn-ghost">
                    {CARD_UI_TEXT.targetCase}
                  </Link>
                  <button
                    type="button"
                    className="btn btn-sm btn-ghost"
                    onClick={() => discardPartyCard(card.id)}
                  >
                    {CARD_UI_TEXT.discardCard}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm opacity-60">{CARD_UI_TEXT.noHand}</p>
        )}
      </article>

      <article className="panel panel-support space-y-3">
        <h3 className="text-lg font-semibold">{CARD_UI_TEXT.queuedHeading}</h3>
        {partyCards.queuedPlays.length > 0 ? (
          <ul className="space-y-2">
            {partyCards.queuedPlays.map((play) => {
              const card = partyCards.cards[play.cardId]

              return (
                <li
                  key={play.playId}
                  className="rounded border border-white/10 px-3 py-2 text-sm opacity-80"
                >
                  <span className="font-medium">{card?.title ?? play.cardId}</span>
                  {' · '}
                  {play.targetCaseId ? `Case ${play.targetCaseId}` : SHELL_UI_TEXT.none}
                  {' · '}
                  {play.targetTeamId ? `Team ${play.targetTeamId}` : SHELL_UI_TEXT.none}
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="text-sm opacity-60">{CARD_UI_TEXT.noQueued}</p>
        )}
      </article>
    </section>
  )
}
