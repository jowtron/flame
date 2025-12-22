import { Link } from 'react-router-dom';
import classes from './BookmarkGrid.module.css';
import { Category } from '../../../interfaces';
import { BookmarkCard } from '../BookmarkCard/BookmarkCard';
import { Message } from '../../UI';

interface Props {
  categories: Category[];
  searching: boolean;
  fromHomepage?: boolean;
  /** Optional: count of all categories to decide pinned vs empty message */
  totalCategories?: number;
  /** Optional: click handler to select/edit category title (disabled on homepage) */
  selectCategoryHandler?: (category: Category) => void;
}

export const BookmarkGrid = (props: Props): JSX.Element => {
  const {
    categories,
    searching,
    fromHomepage = false,
    totalCategories,
    selectCategoryHandler,
  } = props;

  // Smaller icons on homepage
  const iconSizePx = fromHomepage ? 18 : 22;

  let bookmarks: JSX.Element;

  if (categories.length) {
    // Searching but first (aggregated) category has no results
    if (searching && !(categories[0]?.bookmarks?.length)) {
      bookmarks = <Message>No bookmarks match your search criteria</Message>;
    } else {
      bookmarks = (
        <div className={classes.BookmarkGrid}>
          {categories.map((category: Category): JSX.Element => (
            <BookmarkCard
              key={category.id}
              category={category}
              fromHomepage={fromHomepage}
              iconSizePx={iconSizePx}
              selectCategoryHandler={selectCategoryHandler}
            />
          ))}
        </div>
      );
    }
  } else {
    // No categories to render: differentiate pinned-empty vs global-empty
    if (typeof totalCategories === 'number' && totalCategories > 0) {
      bookmarks = (
        <Message>
          There are no pinned categories. You can pin them from the{' '}
          <Link to="/bookmarks">/bookmarks</Link> menu
        </Message>
      );
    } else {
      bookmarks = (
        <Message>
          You don&apos;t have any bookmarks. You can add a new one from{' '}
          <Link to="/bookmarks">/bookmarks</Link> menu
        </Message>
      );
    }
  }

  return bookmarks;
};

