import React, { Fragment, useEffect, useRef, useState, SyntheticEvent, MouseEvent } from 'react';
import classNames from 'classnames';
import isFunction from 'lodash/isFunction';
import { ImageErrorIcon as TdImageErrorIcon, ImageIcon as TdImageIcon } from 'tdesign-icons-react';
import observe from '../_common/js/utils/observe';
import useConfig from '../hooks/useConfig';
import { useLocaleReceiver } from '../locale/LocalReceiver';
import { TdImageProps } from './type';
import { imageDefaultProps } from './defaultProps';
import Space from '../space';
import useGlobalIcon from '../hooks/useGlobalIcon';
import { StyledProps } from '../common';
import useDefaultProps from '../hooks/useDefaultProps';
import useImagePreviewUrl from '../hooks/useImagePreviewUrl';

export type ImageProps = TdImageProps &
  StyledProps & {
    onClick?: (e: MouseEvent<HTMLDivElement>) => void;
    onMouseDown?: (e: MouseEvent<HTMLDivElement>) => void;
    draggable?: boolean;
  };

const InternalImage: React.ForwardRefRenderFunction<HTMLDivElement, ImageProps> = (originalProps, ref) => {
  const props = useDefaultProps<ImageProps>(originalProps, imageDefaultProps);
  const {
    className,
    src,
    style,
    alt,
    fit,
    position,
    shape,
    placeholder,
    loading,
    error,
    overlayTrigger,
    lazy,
    gallery,
    overlayContent,
    srcset,
    fallback,
    onLoad,
    onError,
    ...rest
  } = props;

  const { classPrefix } = useConfig();
  const imageRef = useRef<HTMLDivElement>(null);
  const [local, t] = useLocaleReceiver('image');
  const { ImageErrorIcon, ImageIcon } = useGlobalIcon({
    ImageErrorIcon: TdImageErrorIcon,
    ImageIcon: TdImageIcon,
  });

  React.useImperativeHandle(ref, () => imageRef.current);

  const [imageSrc, setImageSrc] = useState(src);

  useEffect(() => {
    const tmpUrl = isFunction(local.replaceImageSrc) ? local.replaceImageSrc(props) : src;
    if (tmpUrl === imageSrc && imageSrc) return;
    setImageSrc(tmpUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src, local, props]);

  const { previewUrl } = useImagePreviewUrl(imageSrc);

  const [shouldLoad, setShouldLoad] = useState(!lazy);
  const handleLoadImage = () => {
    setShouldLoad(true);
  };

  const [isLoaded, setIsLoaded] = useState(false);
  const handleLoad = (e: SyntheticEvent<HTMLImageElement>) => {
    setIsLoaded(true);
    onLoad?.({ e });
  };

  useEffect(() => {
    if (!lazy || !imageRef?.current) {
      return;
    }

    // https://stackoverflow.com/questions/67069827/cleanup-ref-issues-in-react
    let observerRefValue = null;

    const io = observe(imageRef.current, null, handleLoadImage, 0);
    observerRefValue = imageRef.current;

    return () => {
      observerRefValue && io && io.unobserve(observerRefValue);
    };
  }, [lazy, imageRef]);

  const [hasError, setHasError] = useState(false);
  const handleError = (e: SyntheticEvent<HTMLImageElement>) => {
    setHasError(true);
    if (fallback) {
      setImageSrc(fallback);
      setHasError(false);
    }
    onError?.({ e });
  };

  useEffect(() => {
    if (hasError && previewUrl) {
      setHasError(false);
    }
    // eslint-disable-next-line
  }, [previewUrl]);

  const hasMouseEvent = overlayTrigger === 'hover';
  const [shouldShowOverlay, setShouldShowOverlay] = useState(!hasMouseEvent);
  const handleToggleOverlay = (overlay: boolean) => {
    setShouldShowOverlay(overlay);
  };
  const renderOverlay = () => {
    if (!overlayContent) {
      return null;
    }
    return (
      <div
        className={classNames(
          `${classPrefix}-image__overlay-content`,
          !shouldShowOverlay && `${classPrefix}-image__overlay-content--hidden`,
        )}
      >
        {overlayContent}
      </div>
    );
  };

  const renderPlaceholder = () => {
    if (!placeholder) {
      return null;
    }
    return <div className={`${classPrefix}-image__placeholder`}>{placeholder}</div>;
  };

  const renderGalleryShadow = () => {
    if (!gallery) {
      return null;
    }
    return <div className={`${classPrefix}-image__gallery-shadow`} />;
  };

  const renderImage = () => {
    const url = typeof imageSrc === 'string' ? imageSrc : previewUrl;
    return (
      <img
        src={url}
        onError={handleError}
        onLoad={handleLoad}
        className={classNames(
          `${classPrefix}-image`,
          `${classPrefix}-image--fit-${fit}`,
          `${classPrefix}-image--position-${position}`,
        )}
        alt={alt}
      />
    );
  };

  const renderImageSrcset = () => (
    <picture>
      {Object.entries(props.srcset).map(([type, url]) => (
        <source key={url} type={type} srcSet={url} />
      ))}
      {props.src && renderImage()}
    </picture>
  );

  return (
    <div
      ref={imageRef}
      className={classNames(
        `${classPrefix}-image__wrapper`,
        `${classPrefix}-image__wrapper--shape-${shape}`,
        gallery && `${classPrefix}-image__wrapper--gallery`,
        hasMouseEvent && `${classPrefix}-image__wrapper--need-hover`,
        className,
      )}
      style={style}
      {...(hasMouseEvent
        ? {
            onMouseEnter: () => handleToggleOverlay(true),
            onMouseLeave: () => handleToggleOverlay(false),
          }
        : null)}
      {...rest}
    >
      {renderPlaceholder()}

      {renderGalleryShadow()}

      {!(hasError || !shouldLoad) && (
        <Fragment>
          {srcset && Object.keys(srcset).length ? renderImageSrcset() : renderImage()}
          {!(hasError || !shouldLoad) && !isLoaded && (
            <div className={`${classPrefix}-image__loading`}>
              {loading || (
                <Space direction="vertical" size={8} align="center">
                  <ImageIcon size={24} />
                  {/* support loading = '' to hide loading text */}
                  {typeof loading === 'string' ? loading : t(local.loadingText)}
                </Space>
              )}
            </div>
          )}
        </Fragment>
      )}

      {hasError && (
        <div className={`${classPrefix}-image__error`}>
          {error || (
            <Space direction="vertical" size={8} align="center">
              <ImageErrorIcon size={24} />
              {typeof error === 'string' ? error : t(local.errorText)}
            </Space>
          )}
        </div>
      )}
      {renderOverlay()}
    </div>
  );
};

const Image = React.forwardRef<HTMLDivElement, ImageProps>(InternalImage);

Image.displayName = 'Image';

export default Image;
