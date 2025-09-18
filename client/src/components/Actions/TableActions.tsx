import { Icon } from '../UI';
import classes from './TableActions.module.css';

interface Entity {
  id: number;
  name: string;
  isPinned?: boolean;
  isPublic: boolean;
}

interface Props {
  entity: Entity;
  deleteHandler: (id: number, name: string) => void;
  updateHandler: (id: number) => void;
  pinHanlder?: (id: number) => void;
  changeVisibilty: (id: number) => void;
  showPin?: boolean;
  iconSizePx?: number;
}

export const TableActions = (props: Props): JSX.Element => {
  const {
    entity,
    deleteHandler,
    updateHandler,
    pinHanlder,
    changeVisibilty,
    showPin = true,
    iconSizePx = 20,
  } = props;

  const _pinHandler = pinHanlder || function () {};

  // keyboard helpers
  const onKeyActivate =
    (fn: () => void) =>
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        fn();
      }
    };

  return (
    <td className={classes.TableActions}>
      {/* DELETE */}
      <div
        className={classes.TableAction}
        onClick={() => deleteHandler(entity.id, entity.name)}
        onKeyDown={onKeyActivate(() => deleteHandler(entity.id, entity.name))}
        tabIndex={0}
        role="button"
        aria-label="Delete"
        title="Delete"
      >
        <Icon icon="mdiDelete" sizePx={iconSizePx} />
      </div>

      {/* UPDATE */}
      <div
        className={classes.TableAction}
        onClick={() => updateHandler(entity.id)}
        onKeyDown={onKeyActivate(() => updateHandler(entity.id))}
        tabIndex={0}
        role="button"
        aria-label="Edit"
        title="Edit"
      >
        <Icon icon="mdiPencil" sizePx={iconSizePx} />
      </div>

      {/* PIN / UNPIN (action-based icon) */}
      {showPin && (
        <div
          className={classes.TableAction}
          onClick={() => _pinHandler(entity.id)}
          onKeyDown={onKeyActivate(() => _pinHandler(entity.id))}
          tabIndex={0}
          role="button"
          aria-label={entity.isPinned ? 'Unpin' : 'Pin'}
          title={entity.isPinned ? 'Unpin' : 'Pin'}
        >
          {entity.isPinned ? (
            // Action is "Unpin"
            <Icon icon="mdiPinOff" color="var(--color-accent)" sizePx={iconSizePx} />
          ) : (
            // Action is "Pin"
            <Icon icon="mdiPin" sizePx={iconSizePx} />
          )}
        </div>
      )}

      {/* VISIBILITY (action-based icon) */}
      <div
        className={classes.TableAction}
        onClick={() => changeVisibilty(entity.id)}
        onKeyDown={onKeyActivate(() => changeVisibilty(entity.id))}
        tabIndex={0}
        role="button"
        aria-label={entity.isPublic ? 'Hide' : 'Show'}
        title={entity.isPublic ? 'Hide' : 'Show'}
      >
        {entity.isPublic ? (
          // Action is "Hide"
          <Icon icon="mdiEyeOff" color="var(--color-accent)" sizePx={iconSizePx} />
        ) : (
          // Action is "Show"
          <Icon icon="mdiEye" sizePx={iconSizePx} />
        )}
      </div>
    </td>
  );
};
