import { Mosaic } from 'react-loading-indicators';

function Loading({ size = 'medium', className = '' }) {
  return (
    <div className={`d-flex justify-content-center align-items-center ${className}`}>
      <Mosaic color={["#32cd32", "#327fcd", "#cd32cd", "#cd8032"]} size={size} text ="Loading ..." textColor='#328b47' />
    </div>
  );
}

export default Loading;

