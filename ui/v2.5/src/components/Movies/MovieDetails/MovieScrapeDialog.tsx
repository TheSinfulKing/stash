import React, { useState } from "react";
import { useIntl } from "react-intl";
import * as GQL from "src/core/generated-graphql";
import {
  ScrapeDialog,
  ScrapeResult,
  ScrapedInputGroupRow,
  ScrapedImageRow,
  ScrapeDialogRow,
  ScrapedTextAreaRow,
} from "src/components/Shared/ScrapeDialog";
import { StudioSelect } from "src/components/Shared";
import { DurationUtils } from "src/utils";

function renderScrapedStudio(
  result: ScrapeResult<string>,
  isNew?: boolean,
  onChange?: (value: string) => void
) {
  const resultValue = isNew ? result.newValue : result.originalValue;
  const value = resultValue ? [resultValue] : [];

  return (
    <StudioSelect
      className="form-control react-select"
      isDisabled={!isNew}
      onSelect={(items) => {
        if (onChange) {
          onChange(items[0]?.id);
        }
      }}
      ids={value}
    />
  );
}

function renderScrapedStudioRow(
  result: ScrapeResult<string>,
  onChange: (value: ScrapeResult<string>) => void
) {
  return (
    <ScrapeDialogRow
      title="Studio"
      result={result}
      renderOriginalField={() => renderScrapedStudio(result)}
      renderNewField={() =>
        renderScrapedStudio(result, true, (value) =>
          onChange(result.cloneWithValue(value))
        )
      }
      onChange={onChange}
    />
  );
}

interface IMovieScrapeDialogProps {
  movie: Partial<GQL.MovieUpdateInput>;
  scraped: GQL.ScrapedMovie;

  onClose: (scrapedMovie?: GQL.ScrapedMovie) => void;
}

export const MovieScrapeDialog: React.FC<IMovieScrapeDialogProps> = (
  props: IMovieScrapeDialogProps
) => {
  const intl = useIntl();

  const [name, setName] = useState<ScrapeResult<string>>(
    new ScrapeResult<string>(props.movie.name, props.scraped.name)
  );
  const [aliases, setAliases] = useState<ScrapeResult<string>>(
    new ScrapeResult<string>(props.movie.aliases, props.scraped.aliases)
  );
  const [duration, setDuration] = useState<ScrapeResult<string>>(
    new ScrapeResult<string>(
      DurationUtils.secondsToString(props.movie.duration || 0),
      props.scraped.duration
    )
  );
  const [date, setDate] = useState<ScrapeResult<string>>(
    new ScrapeResult<string>(props.movie.date, props.scraped.date)
  );
  const [director, setDirector] = useState<ScrapeResult<string>>(
    new ScrapeResult<string>(props.movie.director, props.scraped.director)
  );
  const [synopsis, setSynopsis] = useState<ScrapeResult<string>>(
    new ScrapeResult<string>(props.movie.synopsis, props.scraped.synopsis)
  );
  const [studio, setStudio] = useState<ScrapeResult<string>>(
    new ScrapeResult<string>(
      props.movie.studio_id,
      props.scraped.studio?.stored_id
    )
  );
  const [url, setURL] = useState<ScrapeResult<string>>(
    new ScrapeResult<string>(props.movie.url, props.scraped.url)
  );
  const [frontImage, setFrontImage] = useState<ScrapeResult<string>>(
    new ScrapeResult<string>(props.movie.front_image, props.scraped.front_image)
  );
  const [backImage, setBackImage] = useState<ScrapeResult<string>>(
    new ScrapeResult<string>(props.movie.back_image, props.scraped.back_image)
  );

  const allFields = [
    name,
    aliases,
    duration,
    date,
    director,
    synopsis,
    studio,
    url,
    frontImage,
    backImage,
  ];
  // don't show the dialog if nothing was scraped
  if (allFields.every((r) => !r.scraped)) {
    props.onClose();
    return <></>;
  }

  // todo: reenable
  function makeNewScrapedItem(): GQL.ScrapedMovie {
    const newStudio = studio.getNewValue();
    const durationString = duration.getNewValue();

    return {
      name: name.getNewValue() ?? "",
      aliases: aliases.getNewValue(),
      duration: durationString,
      date: date.getNewValue(),
      director: director.getNewValue(),
      synopsis: synopsis.getNewValue(),
      studio: newStudio
        ? {
            stored_id: newStudio,
            name: "",
          }
        : undefined,
      url: url.getNewValue(),
      front_image: frontImage.getNewValue(),
      back_image: backImage.getNewValue(),
    };
  }

  function renderScrapeRows() {
    return (
      <>
        <ScrapedInputGroupRow
          title="Name"
          result={name}
          onChange={(value) => setName(value)}
        />
        <ScrapedInputGroupRow
          title="Aliases"
          result={aliases}
          onChange={(value) => setAliases(value)}
        />
        <ScrapedInputGroupRow
          title="Duration"
          result={duration}
          onChange={(value) => setDuration(value)}
        />
        <ScrapedInputGroupRow
          title="Date"
          placeholder="YYYY-MM-DD"
          result={date}
          onChange={(value) => setDate(value)}
        />
        <ScrapedInputGroupRow
          title="Director"
          result={director}
          onChange={(value) => setDirector(value)}
        />
        <ScrapedTextAreaRow
          title="Synopsis"
          result={synopsis}
          onChange={(value) => setSynopsis(value)}
        />
        {renderScrapedStudioRow(studio, (value) => setStudio(value))}
        <ScrapedInputGroupRow
          title="URL"
          result={url}
          onChange={(value) => setURL(value)}
        />
        <ScrapedImageRow
          title="Front Image"
          className="movie-image"
          result={frontImage}
          onChange={(value) => setFrontImage(value)}
        />
        <ScrapedImageRow
          title="Back Image"
          className="movie-image"
          result={backImage}
          onChange={(value) => setBackImage(value)}
        />
      </>
    );
  }

  return (
    <ScrapeDialog
      title={intl.formatMessage(
        { id: "dialogs.scrape_entity_title" },
        { entity_type: intl.formatMessage({ id: "movie" }) }
      )}
      renderScrapeRows={renderScrapeRows}
      onClose={(apply) => {
        props.onClose(apply ? makeNewScrapedItem() : undefined);
      }}
    />
  );
};
